/**
 * Frontend Extension SDK
 *
 * Tools, utilities, and components for building MachShop UI extensions.
 * Enforces Ant Design usage, design tokens, and permission-aware rendering.
 *
 * @module frontend-extension-sdk
 */

// Export context and provider
export {
  ExtensionContextObj,
  ExtensionContextProvider,
  useExtensionContext,
  createDefaultLogger,
  createExtensionContext,
  type ExtensionContext,
  type Logger,
  type ThemeConfig,
} from './context';

// Export theme utilities
export {
  useTheme,
  ThemeProvider,
  type DesignTokens,
  type ThemeHookReturn,
} from './theme/useTheme';

// Export permission utilities
export {
  usePermission,
  useRequirePermission,
  useRequireRole,
  ProtectedComponent,
  withPermissionGuard,
  type PermissionChecker,
} from './permissions/usePermission';

// Export widget utilities
export {
  useWidgetSlot,
  useRegisterWidget,
  useWidget,
  useExtensionWidgets,
  WidgetSlotRenderer,
  withWidgetErrorBoundary,
  type WidgetSlotInfo,
} from './widgets/useWidgetSlot';

/**
 * SDK Version
 */
export const SDK_VERSION = '2.0.0';

/**
 * Initialization function for extensions
 *
 * Call this in your extension's entry point to ensure SDK is ready
 */
export async function initializeExtensionSDK(): Promise<void> {
  console.info(`Frontend Extension SDK v${SDK_VERSION} initialized`);
}
