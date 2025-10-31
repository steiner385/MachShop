/**
 * KeyboardAccessible Component
 * Issue #281: Systematic Keyboard Navigation Enhancement
 *
 * Higher-order component and utilities to add keyboard navigation
 * to existing interactive elements without major refactoring
 */

import React, { forwardRef, ReactElement } from 'react';
import { useKeyboardHandler } from '../../hooks/useKeyboardHandler';
import { buildAriaAttributes, ARIA_PATTERNS } from '../../utils/ariaUtils';

export interface KeyboardAccessibleProps {
  /** Children to make keyboard accessible */
  children: ReactElement;
  /** Enable keyboard activation (Enter/Space) */
  enableActivation?: boolean;
  /** Enable arrow navigation */
  enableArrowNavigation?: boolean;
  /** Enable escape key handling */
  enableEscape?: boolean;
  /** Callback for activation (Enter/Space) */
  onActivate?: (event: KeyboardEvent) => void;
  /** Callback for arrow navigation */
  onArrowNavigation?: (direction: 'up' | 'down' | 'left' | 'right', event: KeyboardEvent) => void;
  /** Callback for escape key */
  onEscape?: (event: KeyboardEvent) => void;
  /** ARIA role to apply */
  role?: string;
  /** ARIA label */
  ariaLabel?: string;
  /** ARIA described by */
  ariaDescribedBy?: string;
  /** Whether element is disabled */
  disabled?: boolean;
  /** Additional keyboard event handler */
  onKeyDown?: (event: React.KeyboardEvent) => void;
}

/**
 * Higher-order component to add keyboard navigation to any element
 */
export const KeyboardAccessible = forwardRef<HTMLElement, KeyboardAccessibleProps>(({
  children,
  enableActivation = true,
  enableArrowNavigation = false,
  enableEscape = false,
  onActivate,
  onArrowNavigation,
  onEscape,
  role,
  ariaLabel,
  ariaDescribedBy,
  disabled = false,
  onKeyDown,
}, ref) => {
  const { keyboardProps } = useKeyboardHandler({
    enableActivation,
    enableArrowNavigation,
    enableEscape,
    onActivate: onActivate || (() => {
      // Fallback: trigger click event if no custom activation
      if (children.props.onClick) {
        children.props.onClick();
      }
    }),
    onArrowNavigation,
    onEscape,
    disabled,
  });

  // Merge keyboard props with existing props
  const enhancedProps = {
    ...children.props,
    ref,
    tabIndex: disabled ? -1 : (children.props.tabIndex ?? 0),
    role: role || children.props.role || (enableActivation ? 'button' : undefined),
    'aria-label': ariaLabel || children.props['aria-label'],
    'aria-describedby': ariaDescribedBy || children.props['aria-describedby'],
    'aria-disabled': disabled ? 'true' : children.props['aria-disabled'],
    onKeyDown: (event: React.KeyboardEvent) => {
      // Call our keyboard handler first
      keyboardProps.onKeyDown(event);

      // Then call any existing onKeyDown handler
      if (onKeyDown) {
        onKeyDown(event);
      }
      if (children.props.onKeyDown) {
        children.props.onKeyDown(event);
      }
    },
  };

  return React.cloneElement(children, enhancedProps);
});

KeyboardAccessible.displayName = 'KeyboardAccessible';

export interface ClickableProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Click handler */
  onClick?: (event: React.MouseEvent | KeyboardEvent) => void;
  /** Whether element is disabled */
  disabled?: boolean;
  /** ARIA label */
  ariaLabel?: string;
  /** ARIA described by */
  ariaDescribedBy?: string;
  /** Custom role (defaults to 'button') */
  role?: string;
  /** Children */
  children: React.ReactNode;
}

/**
 * Pre-built clickable div component with keyboard navigation
 * Use this to replace onClick-only divs throughout the application
 */
export const ClickableDiv = forwardRef<HTMLDivElement, ClickableProps>(({
  onClick,
  disabled = false,
  ariaLabel,
  ariaDescribedBy,
  role = 'button',
  children,
  tabIndex,
  onKeyDown,
  className,
  style,
  ...props
}, ref) => {
  const { keyboardProps } = useKeyboardHandler({
    enableActivation: true,
    onActivate: (event) => {
      if (onClick && !disabled) {
        onClick(event);
      }
    },
    disabled,
  });

  const ariaProps = buildAriaAttributes('BUTTON', {
    label: ariaLabel,
    describedBy: ariaDescribedBy,
  }, {
    disabled,
  });

  return (
    <div
      ref={ref}
      className={`${className || ''} ${disabled ? 'disabled' : 'cursor-pointer'}`}
      style={{
        ...style,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
      }}
      role={role}
      tabIndex={disabled ? -1 : (tabIndex ?? keyboardProps.tabIndex)}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-disabled={disabled}
      onClick={(e) => {
        if (!disabled && onClick) {
          onClick(e);
        }
      }}
      onKeyDown={(e) => {
        keyboardProps.onKeyDown(e);
        if (onKeyDown) {
          onKeyDown(e);
        }
      }}
      {...props}
    >
      {children}
    </div>
  );
});

ClickableDiv.displayName = 'ClickableDiv';

export interface ListItemProps extends React.LiHTMLAttributes<HTMLLIElement> {
  /** Whether item is selected */
  selected?: boolean;
  /** Whether item is disabled */
  disabled?: boolean;
  /** Click handler */
  onClick?: (event: React.MouseEvent | KeyboardEvent) => void;
  /** Selection handler */
  onSelect?: (event: React.MouseEvent | KeyboardEvent) => void;
  /** ARIA label */
  ariaLabel?: string;
  /** ARIA described by */
  ariaDescribedBy?: string;
  /** Children */
  children: React.ReactNode;
}

/**
 * Keyboard-accessible list item component
 * Use this for lists that need keyboard navigation
 */
export const KeyboardListItem = forwardRef<HTMLLIElement, ListItemProps>(({
  selected = false,
  disabled = false,
  onClick,
  onSelect,
  ariaLabel,
  ariaDescribedBy,
  children,
  className,
  onKeyDown,
  ...props
}, ref) => {
  const { keyboardProps } = useKeyboardHandler({
    enableActivation: true,
    onActivate: (event) => {
      if (disabled) return;
      if (onSelect) {
        onSelect(event);
      } else if (onClick) {
        onClick(event);
      }
    },
    disabled,
  });

  return (
    <li
      ref={ref}
      className={`${className || ''} ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
      role="option"
      tabIndex={disabled ? -1 : keyboardProps.tabIndex}
      aria-selected={selected}
      aria-disabled={disabled}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      onClick={(e) => {
        if (!disabled) {
          if (onSelect) {
            onSelect(e);
          } else if (onClick) {
            onClick(e);
          }
        }
      }}
      onKeyDown={(e) => {
        keyboardProps.onKeyDown(e);
        if (onKeyDown) {
          onKeyDown(e);
        }
      }}
      {...props}
    >
      {children}
    </li>
  );
});

KeyboardListItem.displayName = 'KeyboardListItem';

export interface SelectableCardProps extends React.DivHTMLAttributes<HTMLDivElement> {
  /** Whether card is selected */
  selected?: boolean;
  /** Whether card is disabled */
  disabled?: boolean;
  /** Selection handler */
  onSelect?: (event: React.MouseEvent | KeyboardEvent) => void;
  /** ARIA label */
  ariaLabel?: string;
  /** ARIA described by */
  ariaDescribedBy?: string;
  /** Children */
  children: React.ReactNode;
}

/**
 * Keyboard-accessible selectable card component
 * Use this for card-based selection interfaces
 */
export const SelectableCard = forwardRef<HTMLDivElement, SelectableCardProps>(({
  selected = false,
  disabled = false,
  onSelect,
  ariaLabel,
  ariaDescribedBy,
  children,
  className,
  onKeyDown,
  style,
  ...props
}, ref) => {
  const { keyboardProps } = useKeyboardHandler({
    enableActivation: true,
    onActivate: (event) => {
      if (!disabled && onSelect) {
        onSelect(event);
      }
    },
    disabled,
  });

  return (
    <div
      ref={ref}
      className={`${className || ''} ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
      style={{
        ...style,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        outline: 'none',
        border: selected ? '2px solid #1890ff' : '1px solid #d9d9d9',
        borderRadius: '6px',
        padding: '12px',
        transition: 'all 0.2s',
        ...style,
      }}
      role="option"
      tabIndex={disabled ? -1 : keyboardProps.tabIndex}
      aria-selected={selected}
      aria-disabled={disabled}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      onClick={(e) => {
        if (!disabled && onSelect) {
          onSelect(e);
        }
      }}
      onKeyDown={(e) => {
        keyboardProps.onKeyDown(e);
        if (onKeyDown) {
          onKeyDown(e);
        }
      }}
      {...props}
    >
      {children}
    </div>
  );
});

SelectableCard.displayName = 'SelectableCard';

export interface ToggleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Whether button is pressed/toggled */
  pressed?: boolean;
  /** Toggle handler */
  onToggle?: (pressed: boolean, event: React.MouseEvent | KeyboardEvent) => void;
  /** ARIA label */
  ariaLabel?: string;
  /** ARIA described by */
  ariaDescribedBy?: string;
  /** Children */
  children: React.ReactNode;
}

/**
 * Keyboard-accessible toggle button component
 * Use this for toggle functionality with proper ARIA states
 */
export const ToggleButton = forwardRef<HTMLButtonElement, ToggleButtonProps>(({
  pressed = false,
  onToggle,
  disabled = false,
  ariaLabel,
  ariaDescribedBy,
  children,
  onClick,
  onKeyDown,
  ...props
}, ref) => {
  const { keyboardProps } = useKeyboardHandler({
    enableActivation: true,
    onActivate: (event) => {
      if (!disabled && onToggle) {
        onToggle(!pressed, event);
      }
    },
    disabled,
  });

  return (
    <button
      ref={ref}
      type="button"
      role="button"
      aria-pressed={pressed}
      aria-disabled={disabled}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      disabled={disabled}
      onClick={(e) => {
        if (!disabled && onToggle) {
          onToggle(!pressed, e);
        }
        if (onClick) {
          onClick(e);
        }
      }}
      onKeyDown={(e) => {
        keyboardProps.onKeyDown(e);
        if (onKeyDown) {
          onKeyDown(e);
        }
      }}
      {...props}
    >
      {children}
    </button>
  );
});

ToggleButton.displayName = 'ToggleButton';

export default KeyboardAccessible;