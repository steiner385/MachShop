/**
 * Extension Context
 *
 * Provides runtime context to extensions including site ID, permissions,
 * theme configuration, and access to the extension registry.
 *
 * @module frontend-extension-sdk/context
 */

import * as React from 'react';

/**
 * Logging interface for extensions
 */
export interface Logger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}

/**
 * Theme configuration
 */
export interface ThemeConfig {
  mode: 'light' | 'dark';
  tokens?: Record<string, string | number>;
}

/**
 * Extension context containing runtime information
 */
export interface ExtensionContext {
  /**
   * Site identifier for multi-tenant isolation
   */
  siteId: string;

  /**
   * Unique extension identifier
   */
  extensionId: string;

  /**
   * User permissions available to the extension
   */
  userPermissions: string[];

  /**
   * User roles for the current session
   */
  userRoles: string[];

  /**
   * Theme configuration
   */
  theme: ThemeConfig;

  /**
   * UI Extension Registry for widget loading
   */
  registry?: any; // UIExtensionRegistry

  /**
   * Logger instance for the extension
   */
  logger: Logger;

  /**
   * API client for extension requests
   */
  apiClient?: any; // AxiosInstance

  /**
   * Whether the extension is in offline mode
   */
  isOffline?: boolean;

  /**
   * Whether the application is in development mode
   */
  isDevelopment?: boolean;

  /**
   * Application version
   */
  appVersion?: string;
}

/**
 * React Context for extension information
 */
export const ExtensionContextObj = React.createContext<ExtensionContext | undefined>(undefined);

/**
 * Provider component for extension context
 */
export function ExtensionContextProvider({
  value,
  children,
}: {
  value: ExtensionContext;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <ExtensionContextObj.Provider value={value}>
      {children}
    </ExtensionContextObj.Provider>
  );
}

/**
 * Hook to access extension context
 *
 * @throws Error if used outside ExtensionContextProvider
 * @returns Extension context object
 *
 * @example
 * ```typescript
 * const { siteId, extensionId, userPermissions } = useExtensionContext();
 * ```
 */
export function useExtensionContext(): ExtensionContext {
  const context = React.useContext(ExtensionContextObj);
  if (!context) {
    throw new Error(
      'useExtensionContext must be used within an ExtensionContextProvider'
    );
  }
  return context;
}

/**
 * Create a default logger implementation
 */
export function createDefaultLogger(extensionId: string): Logger {
  const prefix = `[${extensionId}]`;

  return {
    debug: (message: string, ...args: any[]) => {
      console.debug(`${prefix} ${message}`, ...args);
    },
    info: (message: string, ...args: any[]) => {
      console.info(`${prefix} ${message}`, ...args);
    },
    warn: (message: string, ...args: any[]) => {
      console.warn(`${prefix} ${message}`, ...args);
    },
    error: (message: string, ...args: any[]) => {
      console.error(`${prefix} ${message}`, ...args);
    },
  };
}

/**
 * Create an extension context with sensible defaults
 */
export function createExtensionContext(
  overrides: Partial<ExtensionContext>
): ExtensionContext {
  const extensionId = overrides.extensionId || 'unknown-extension';

  return {
    siteId: overrides.siteId || 'site-default',
    extensionId,
    userPermissions: overrides.userPermissions || [],
    userRoles: overrides.userRoles || [],
    theme: overrides.theme || { mode: 'light' },
    registry: overrides.registry,
    logger: overrides.logger || createDefaultLogger(extensionId),
    apiClient: overrides.apiClient,
    isOffline: overrides.isOffline ?? false,
    isDevelopment: overrides.isDevelopment ?? false,
    appVersion: overrides.appVersion,
  };
}
