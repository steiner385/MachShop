/**
 * Form Builder Core - Main Export File
 */

// Types
export * from './types';

// Validation
export { ValidationEngine } from './validation/ValidationEngine';

// State Management
export { createFormStore, useFormStore } from './state/FormStore';

// Layout
export { LayoutEngine } from './layout/LayoutEngine';

// Components
export { FieldRegistry } from './components/FieldRegistry';

// Version
export const VERSION = '1.0.0';
