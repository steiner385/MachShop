/**
 * ARIA Utilities
 * Issue #281: Systematic Keyboard Navigation Enhancement
 *
 * Provides WCAG 2.1 compliant ARIA utilities, constants, and helper functions
 * for consistent accessibility implementation across the application
 */

// ARIA Roles (WCAG 2.1 compliant)
export const ARIA_ROLES = {
  // Landmark roles
  BANNER: 'banner',
  MAIN: 'main',
  NAVIGATION: 'navigation',
  REGION: 'region',
  SEARCH: 'search',
  CONTENTINFO: 'contentinfo',
  COMPLEMENTARY: 'complementary',

  // Widget roles
  BUTTON: 'button',
  CHECKBOX: 'checkbox',
  RADIO: 'radio',
  SLIDER: 'slider',
  SPINBUTTON: 'spinbutton',
  TEXTBOX: 'textbox',
  COMBOBOX: 'combobox',
  LISTBOX: 'listbox',
  OPTION: 'option',
  MENUBAR: 'menubar',
  MENU: 'menu',
  MENUITEM: 'menuitem',
  MENUITEMCHECKBOX: 'menuitemcheckbox',
  MENUITEMRADIO: 'menuitemradio',
  TAB: 'tab',
  TABLIST: 'tablist',
  TABPANEL: 'tabpanel',
  TREE: 'tree',
  TREEITEM: 'treeitem',
  GRID: 'grid',
  GRIDCELL: 'gridcell',
  ROW: 'row',
  ROWHEADER: 'rowheader',
  COLUMNHEADER: 'columnheader',

  // Dialog roles
  DIALOG: 'dialog',
  ALERTDIALOG: 'alertdialog',
  TOOLTIP: 'tooltip',

  // Status roles
  ALERT: 'alert',
  STATUS: 'status',
  LOG: 'log',
  PROGRESSBAR: 'progressbar',

  // Structure roles
  LIST: 'list',
  LISTITEM: 'listitem',
  TABLE: 'table',
  GROUP: 'group',
  TOOLBAR: 'toolbar',
  SEPARATOR: 'separator',
  PRESENTATION: 'presentation',
  NONE: 'none',
} as const;

// ARIA Properties and States
export const ARIA_PROPERTIES = {
  // Widget properties
  LABEL: 'aria-label',
  LABELLEDBY: 'aria-labelledby',
  DESCRIBEDBY: 'aria-describedby',
  PLACEHOLDER: 'aria-placeholder',
  REQUIRED: 'aria-required',
  INVALID: 'aria-invalid',
  READONLY: 'aria-readonly',
  DISABLED: 'aria-disabled',
  HIDDEN: 'aria-hidden',

  // Live region properties
  LIVE: 'aria-live',
  ATOMIC: 'aria-atomic',
  RELEVANT: 'aria-relevant',

  // Relationship properties
  CONTROLS: 'aria-controls',
  OWNS: 'aria-owns',
  FLOWTO: 'aria-flowto',

  // Widget states
  EXPANDED: 'aria-expanded',
  SELECTED: 'aria-selected',
  CHECKED: 'aria-checked',
  PRESSED: 'aria-pressed',
  CURRENT: 'aria-current',

  // Grid properties
  ROWCOUNT: 'aria-rowcount',
  COLCOUNT: 'aria-colcount',
  ROWINDEX: 'aria-rowindex',
  COLINDEX: 'aria-colindex',
  ROWSPAN: 'aria-rowspan',
  COLSPAN: 'aria-colspan',

  // List properties
  SETSIZE: 'aria-setsize',
  POSINSET: 'aria-posinset',

  // Level and hierarchy
  LEVEL: 'aria-level',
  HASPOPUP: 'aria-haspopup',

  // Value properties
  VALUEMIN: 'aria-valuemin',
  VALUEMAX: 'aria-valuemax',
  VALUENOW: 'aria-valuenow',
  VALUETEXT: 'aria-valuetext',
} as const;

// ARIA Live Region Types
export const ARIA_LIVE_TYPES = {
  OFF: 'off',
  POLITE: 'polite',
  ASSERTIVE: 'assertive',
} as const;

// ARIA Has Popup Types
export const ARIA_HASPOPUP_TYPES = {
  FALSE: 'false',
  TRUE: 'true',
  MENU: 'menu',
  LISTBOX: 'listbox',
  TREE: 'tree',
  GRID: 'grid',
  DIALOG: 'dialog',
} as const;

// ARIA Current Types
export const ARIA_CURRENT_TYPES = {
  FALSE: 'false',
  TRUE: 'true',
  PAGE: 'page',
  STEP: 'step',
  LOCATION: 'location',
  DATE: 'date',
  TIME: 'time',
} as const;

// Common ARIA attribute combinations for components
export const ARIA_PATTERNS = {
  BUTTON: {
    role: ARIA_ROLES.BUTTON,
    tabIndex: 0,
  },
  MENU_BUTTON: {
    role: ARIA_ROLES.BUTTON,
    [ARIA_PROPERTIES.HASPOPUP]: ARIA_HASPOPUP_TYPES.MENU,
    [ARIA_PROPERTIES.EXPANDED]: 'false',
    tabIndex: 0,
  },
  DIALOG: {
    role: ARIA_ROLES.DIALOG,
    [ARIA_PROPERTIES.HIDDEN]: 'false',
    tabIndex: -1,
  },
  MODAL_DIALOG: {
    role: ARIA_ROLES.DIALOG,
    [ARIA_PROPERTIES.HIDDEN]: 'false',
    'aria-modal': 'true',
    tabIndex: -1,
  },
  ALERT_DIALOG: {
    role: ARIA_ROLES.ALERTDIALOG,
    [ARIA_PROPERTIES.HIDDEN]: 'false',
    'aria-modal': 'true',
    tabIndex: -1,
  },
  COMBOBOX: {
    role: ARIA_ROLES.COMBOBOX,
    [ARIA_PROPERTIES.EXPANDED]: 'false',
    [ARIA_PROPERTIES.HASPOPUP]: ARIA_HASPOPUP_TYPES.LISTBOX,
    tabIndex: 0,
  },
  LISTBOX: {
    role: ARIA_ROLES.LISTBOX,
    tabIndex: 0,
  },
  OPTION: {
    role: ARIA_ROLES.OPTION,
    [ARIA_PROPERTIES.SELECTED]: 'false',
  },
  TAB: {
    role: ARIA_ROLES.TAB,
    [ARIA_PROPERTIES.SELECTED]: 'false',
    tabIndex: -1,
  },
  TABLIST: {
    role: ARIA_ROLES.TABLIST,
  },
  TABPANEL: {
    role: ARIA_ROLES.TABPANEL,
    tabIndex: 0,
  },
  TOOLBAR: {
    role: ARIA_ROLES.TOOLBAR,
  },
  GRID: {
    role: ARIA_ROLES.GRID,
    tabIndex: 0,
  },
  GRIDCELL: {
    role: ARIA_ROLES.GRIDCELL,
    tabIndex: -1,
  },
  LIVE_REGION_POLITE: {
    [ARIA_PROPERTIES.LIVE]: ARIA_LIVE_TYPES.POLITE,
    [ARIA_PROPERTIES.ATOMIC]: 'true',
  },
  LIVE_REGION_ASSERTIVE: {
    [ARIA_PROPERTIES.LIVE]: ARIA_LIVE_TYPES.ASSERTIVE,
    [ARIA_PROPERTIES.ATOMIC]: 'true',
  },
} as const;

export interface AriaLabelOptions {
  /** Primary label text */
  label?: string;
  /** ID of element(s) that label this element */
  labelledBy?: string | string[];
  /** ID of element(s) that describe this element */
  describedBy?: string | string[];
  /** Placeholder text */
  placeholder?: string;
}

export interface AriaStateOptions {
  /** Whether element is required */
  required?: boolean;
  /** Whether element is invalid */
  invalid?: boolean | string;
  /** Whether element is disabled */
  disabled?: boolean;
  /** Whether element is readonly */
  readonly?: boolean;
  /** Whether element is hidden */
  hidden?: boolean;
  /** Whether element is expanded (for collapsible elements) */
  expanded?: boolean;
  /** Whether element is selected */
  selected?: boolean;
  /** Whether element is checked (for checkboxes/radios) */
  checked?: boolean | 'mixed';
  /** Whether element is pressed (for toggle buttons) */
  pressed?: boolean;
}

/**
 * Generate unique ID for ARIA relationships
 */
export const generateAriaId = (prefix: string = 'aria'): string => {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Build ARIA label attributes
 */
export const buildAriaLabel = (options: AriaLabelOptions): Record<string, string> => {
  const attrs: Record<string, string> = {};

  if (options.label) {
    attrs[ARIA_PROPERTIES.LABEL] = options.label;
  }

  if (options.labelledBy) {
    const ids = Array.isArray(options.labelledBy)
      ? options.labelledBy.join(' ')
      : options.labelledBy;
    attrs[ARIA_PROPERTIES.LABELLEDBY] = ids;
  }

  if (options.describedBy) {
    const ids = Array.isArray(options.describedBy)
      ? options.describedBy.join(' ')
      : options.describedBy;
    attrs[ARIA_PROPERTIES.DESCRIBEDBY] = ids;
  }

  if (options.placeholder) {
    attrs[ARIA_PROPERTIES.PLACEHOLDER] = options.placeholder;
  }

  return attrs;
};

/**
 * Build ARIA state attributes
 */
export const buildAriaState = (options: AriaStateOptions): Record<string, string> => {
  const attrs: Record<string, string> = {};

  if (options.required !== undefined) {
    attrs[ARIA_PROPERTIES.REQUIRED] = String(options.required);
  }

  if (options.invalid !== undefined) {
    attrs[ARIA_PROPERTIES.INVALID] = typeof options.invalid === 'string'
      ? options.invalid
      : String(options.invalid);
  }

  if (options.disabled !== undefined) {
    attrs[ARIA_PROPERTIES.DISABLED] = String(options.disabled);
  }

  if (options.readonly !== undefined) {
    attrs[ARIA_PROPERTIES.READONLY] = String(options.readonly);
  }

  if (options.hidden !== undefined) {
    attrs[ARIA_PROPERTIES.HIDDEN] = String(options.hidden);
  }

  if (options.expanded !== undefined) {
    attrs[ARIA_PROPERTIES.EXPANDED] = String(options.expanded);
  }

  if (options.selected !== undefined) {
    attrs[ARIA_PROPERTIES.SELECTED] = String(options.selected);
  }

  if (options.checked !== undefined) {
    attrs[ARIA_PROPERTIES.CHECKED] = String(options.checked);
  }

  if (options.pressed !== undefined) {
    attrs[ARIA_PROPERTIES.PRESSED] = String(options.pressed);
  }

  return attrs;
};

/**
 * Build complete ARIA attributes for a component
 */
export const buildAriaAttributes = (
  pattern: keyof typeof ARIA_PATTERNS,
  labelOptions?: AriaLabelOptions,
  stateOptions?: AriaStateOptions,
  additionalAttrs?: Record<string, string>
): Record<string, string | number> => {
  const basePattern = ARIA_PATTERNS[pattern];
  const labelAttrs = labelOptions ? buildAriaLabel(labelOptions) : {};
  const stateAttrs = stateOptions ? buildAriaState(stateOptions) : {};

  return {
    ...basePattern,
    ...labelAttrs,
    ...stateAttrs,
    ...additionalAttrs,
  };
};

/**
 * Create live region announcer
 */
export const createLiveRegion = (
  type: keyof typeof ARIA_LIVE_TYPES = 'POLITE',
  atomic: boolean = true
): HTMLDivElement => {
  const liveRegion = document.createElement('div');
  liveRegion.setAttribute(ARIA_PROPERTIES.LIVE, ARIA_LIVE_TYPES[type]);
  liveRegion.setAttribute(ARIA_PROPERTIES.ATOMIC, String(atomic));
  liveRegion.style.position = 'absolute';
  liveRegion.style.left = '-10000px';
  liveRegion.style.width = '1px';
  liveRegion.style.height = '1px';
  liveRegion.style.overflow = 'hidden';

  return liveRegion;
};

/**
 * Announce message to screen readers
 */
export const announceToScreenReader = (
  message: string,
  type: keyof typeof ARIA_LIVE_TYPES = 'POLITE',
  delay: number = 100
): void => {
  // Create temporary live region
  const liveRegion = createLiveRegion(type);
  document.body.appendChild(liveRegion);

  // Delay to ensure screen reader notices the element
  setTimeout(() => {
    liveRegion.textContent = message;

    // Remove after announcement
    setTimeout(() => {
      if (document.body.contains(liveRegion)) {
        document.body.removeChild(liveRegion);
      }
    }, 1000);
  }, delay);
};

/**
 * Check if element is focusable
 */
export const isFocusable = (element: HTMLElement): boolean => {
  if (element.hasAttribute('disabled')) return false;
  if (element.getAttribute('tabindex') === '-1') return false;
  if (element.getAttribute('aria-hidden') === 'true') return false;

  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') return false;

  const tagName = element.tagName.toLowerCase();
  const focusableTags = ['input', 'button', 'select', 'textarea', 'a'];

  if (focusableTags.includes(tagName)) return true;
  if (element.hasAttribute('tabindex')) return true;
  if (element.getAttribute('contenteditable') === 'true') return true;

  return false;
};

/**
 * Get accessible name for an element
 */
export const getAccessibleName = (element: HTMLElement): string => {
  // Check aria-label first
  const ariaLabel = element.getAttribute(ARIA_PROPERTIES.LABEL);
  if (ariaLabel) return ariaLabel.trim();

  // Check aria-labelledby
  const labelledBy = element.getAttribute(ARIA_PROPERTIES.LABELLEDBY);
  if (labelledBy) {
    const labels = labelledBy.split(' ')
      .map(id => document.getElementById(id)?.textContent?.trim())
      .filter(Boolean)
      .join(' ');
    if (labels) return labels;
  }

  // Check associated label elements
  const id = element.getAttribute('id');
  if (id) {
    const label = document.querySelector(`label[for="${id}"]`);
    if (label?.textContent) return label.textContent.trim();
  }

  // Check parent label
  const parentLabel = element.closest('label');
  if (parentLabel?.textContent) {
    // Remove the input's value from the label text
    const labelText = parentLabel.textContent.trim();
    if (element instanceof HTMLInputElement && element.value) {
      return labelText.replace(element.value, '').trim();
    }
    return labelText;
  }

  // Check placeholder
  const placeholder = element.getAttribute('placeholder') ||
                     element.getAttribute(ARIA_PROPERTIES.PLACEHOLDER);
  if (placeholder) return placeholder.trim();

  // Check text content for buttons and links
  if (['button', 'a'].includes(element.tagName.toLowerCase())) {
    const textContent = element.textContent?.trim();
    if (textContent) return textContent;
  }

  // Check title attribute as last resort
  const title = element.getAttribute('title');
  if (title) return title.trim();

  return '';
};

/**
 * Validate ARIA implementation
 */
export const validateAriaImplementation = (element: HTMLElement): string[] => {
  const issues: string[] = [];

  // Check for accessible name
  const accessibleName = getAccessibleName(element);
  if (!accessibleName && isFocusable(element)) {
    issues.push('Focusable element missing accessible name');
  }

  // Check for invalid ARIA attributes
  const role = element.getAttribute('role');
  if (role && !Object.values(ARIA_ROLES).includes(role as any)) {
    issues.push(`Invalid ARIA role: ${role}`);
  }

  // Check for proper ARIA relationships
  const labelledBy = element.getAttribute(ARIA_PROPERTIES.LABELLEDBY);
  if (labelledBy) {
    const ids = labelledBy.split(' ');
    ids.forEach(id => {
      if (!document.getElementById(id)) {
        issues.push(`aria-labelledby references non-existent element: ${id}`);
      }
    });
  }

  const describedBy = element.getAttribute(ARIA_PROPERTIES.DESCRIBEDBY);
  if (describedBy) {
    const ids = describedBy.split(' ');
    ids.forEach(id => {
      if (!document.getElementById(id)) {
        issues.push(`aria-describedby references non-existent element: ${id}`);
      }
    });
  }

  return issues;
};

/**
 * Common keyboard navigation utilities
 */
export const KEYBOARD_NAVIGATION = {
  ACTIVATION_KEYS: ['Enter', ' '],
  ARROW_KEYS: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'],
  HOME_END_KEYS: ['Home', 'End'],
  TAB_KEYS: ['Tab'],
  ESCAPE_KEYS: ['Escape'],

  isActivationKey: (key: string): boolean =>
    KEYBOARD_NAVIGATION.ACTIVATION_KEYS.includes(key),

  isArrowKey: (key: string): boolean =>
    KEYBOARD_NAVIGATION.ARROW_KEYS.includes(key),

  isNavigationKey: (key: string): boolean =>
    [...KEYBOARD_NAVIGATION.ARROW_KEYS, ...KEYBOARD_NAVIGATION.HOME_END_KEYS].includes(key),
};