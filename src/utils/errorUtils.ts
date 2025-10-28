/**
 * Utility functions for safe error handling
 *
 * Addresses GitHub Issue #16: Authentication Edge Cases
 * Provides defensive programming patterns for handling undefined/malformed error objects
 */

export interface SafeErrorInfo {
  message: string;
  type: string;
  hasMessage: boolean;
  hasCode: boolean;
  hasName: boolean;
  hasStack: boolean;
  keys: string[];
  originalError: any;
}

/**
 * Safely extracts error information from potentially undefined/malformed error objects
 * Prevents "Cannot read properties of undefined (reading 'kind')" type errors
 */
export function safeExtractError(error: any): SafeErrorInfo {
  if (!error) {
    return {
      message: 'Error object is undefined or null',
      type: 'undefined',
      hasMessage: false,
      hasCode: false,
      hasName: false,
      hasStack: false,
      keys: [],
      originalError: error
    };
  }

  const safeMessage = error?.message || error?.toString?.() || String(error) || 'Unknown error';

  return {
    message: safeMessage,
    type: typeof error,
    hasMessage: error?.message !== undefined,
    hasCode: error?.code !== undefined,
    hasName: error?.name !== undefined,
    hasStack: error?.stack !== undefined,
    keys: error && typeof error === 'object' ? Object.keys(error) : [],
    originalError: error
  };
}

/**
 * Safe error message extraction with fallback chain
 */
export function safeErrorMessage(error: any, fallback: string = 'Unknown error'): string {
  if (!error) {
    return 'Error object is undefined or null';
  }

  return error?.message ||
         error?.toString?.() ||
         String(error) ||
         fallback;
}

/**
 * Safe error code extraction
 */
export function safeErrorCode(error: any): string | undefined {
  if (!error) {
    return undefined;
  }

  return error?.code || error?.name || undefined;
}

/**
 * Check if error is a Prisma-related error
 */
export function isPrismaError(error: any): boolean {
  if (!error) {
    return false;
  }

  return error?.name && (
    error.name.includes('Prisma') ||
    error.name.includes('Client') ||
    error.name.includes('ValidationError')
  );
}

/**
 * Check if error is a database-related error
 */
export function isDatabaseError(error: any): boolean {
  if (!error) {
    return false;
  }

  return isPrismaError(error) ||
         (error?.code && typeof error.code === 'string') ||
         (error?.message && error.message.includes('database')) ||
         (error?.message && error.message.includes('connection'));
}

/**
 * Enhanced console error logging with safe error extraction
 */
export function safeConsoleError(prefix: string, error: any, context?: any): void {
  const errorInfo = safeExtractError(error);

  console.error(`${prefix}:`, {
    message: errorInfo.message,
    errorType: errorInfo.type,
    hasMessage: errorInfo.hasMessage,
    hasCode: errorInfo.hasCode,
    hasName: errorInfo.hasName,
    hasStack: errorInfo.hasStack,
    errorKeys: errorInfo.keys,
    ...(context && { context })
  });
}

/**
 * Enhanced logger error logging with safe error extraction
 */
export function safeLoggerError(logger: any, message: string, error: any, context?: any): void {
  const errorInfo = safeExtractError(error);

  logger.error(message, {
    error: errorInfo.message,
    errorType: errorInfo.type,
    hasMessage: errorInfo.hasMessage,
    hasCode: errorInfo.hasCode,
    hasName: errorInfo.hasName,
    hasStack: errorInfo.hasStack,
    errorKeys: errorInfo.keys,
    ...(context && { context })
  });
}

/**
 * Wraps async database operations with enhanced error handling
 */
export async function safeDatabaseOperation<T>(
  operation: () => Promise<T>,
  operationName: string,
  fallbackValue?: T
): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    const errorInfo = safeExtractError(error);

    console.error(`[SafeDB] ${operationName} failed:`, {
      message: errorInfo.message,
      errorType: errorInfo.type,
      hasMessage: errorInfo.hasMessage,
      hasCode: errorInfo.hasCode,
      hasName: errorInfo.hasName,
      errorKeys: errorInfo.keys
    });

    // Re-throw with enhanced error message
    const enhancedMessage = `${operationName} failed: ${errorInfo.message}`;
    throw new Error(enhancedMessage);
  }
}

/**
 * Wraps async operations with retry logic and enhanced error handling
 */
export async function safeRetryOperation<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries: number = 3,
  delayMs: number = 100
): Promise<T> {
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      const errorInfo = safeExtractError(error);

      console.warn(`[SafeRetry] ${operationName} attempt ${attempt}/${maxRetries} failed:`, {
        message: errorInfo.message,
        errorType: errorInfo.type,
        attempt,
        maxRetries
      });

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
  }

  // All retries failed
  const finalErrorInfo = safeExtractError(lastError);
  throw new Error(`${operationName} failed after ${maxRetries} attempts: ${finalErrorInfo.message}`);
}