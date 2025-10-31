/**
 * Comprehensive Error Handling for Kitting & Material Staging System
 *
 * Centralized error definitions, handling, and recovery strategies
 * for all kitting-related operations including standard kits, vendor kits,
 * staging workflows, and material shortage management.
 */

/**
 * Custom error types for different categories of kitting failures
 */
export enum KittingErrorType {
  // Kit Generation Errors
  BOM_ANALYSIS_FAILED = 'BOM_ANALYSIS_FAILED',
  INSUFFICIENT_MATERIALS = 'INSUFFICIENT_MATERIALS',
  INVALID_WORK_ORDER = 'INVALID_WORK_ORDER',
  BOM_NOT_FOUND = 'BOM_NOT_FOUND',
  CIRCULAR_BOM_REFERENCE = 'CIRCULAR_BOM_REFERENCE',

  // Staging Errors
  STAGING_LOCATION_UNAVAILABLE = 'STAGING_LOCATION_UNAVAILABLE',
  STAGING_CAPACITY_EXCEEDED = 'STAGING_CAPACITY_EXCEEDED',
  INVALID_STAGING_TRANSITION = 'INVALID_STAGING_TRANSITION',
  STAGING_AREA_BLOCKED = 'STAGING_AREA_BLOCKED',

  // Kit Status Errors
  INVALID_STATUS_TRANSITION = 'INVALID_STATUS_TRANSITION',
  KIT_ALREADY_CONSUMED = 'KIT_ALREADY_CONSUMED',
  KIT_NOT_STAGED = 'KIT_NOT_STAGED',
  KIT_NOT_ISSUED = 'KIT_NOT_ISSUED',

  // Material Shortage Errors
  CRITICAL_SHORTAGE = 'CRITICAL_SHORTAGE',
  SHORTAGE_RESOLUTION_FAILED = 'SHORTAGE_RESOLUTION_FAILED',
  SUPPLIER_UNAVAILABLE = 'SUPPLIER_UNAVAILABLE',
  LEAD_TIME_EXCEEDED = 'LEAD_TIME_EXCEEDED',

  // Vendor Kitting Errors
  VENDOR_REQUEST_FAILED = 'VENDOR_REQUEST_FAILED',
  VENDOR_QUALITY_FAILURE = 'VENDOR_QUALITY_FAILURE',
  VENDOR_DELIVERY_LATE = 'VENDOR_DELIVERY_LATE',
  VENDOR_INSPECTION_FAILED = 'VENDOR_INSPECTION_FAILED',
  VENDOR_CERTIFICATION_MISSING = 'VENDOR_CERTIFICATION_MISSING',

  // Barcode/Scanning Errors
  INVALID_BARCODE_FORMAT = 'INVALID_BARCODE_FORMAT',
  BARCODE_NOT_FOUND = 'BARCODE_NOT_FOUND',
  DUPLICATE_SCAN_ATTEMPT = 'DUPLICATE_SCAN_ATTEMPT',
  SCAN_LOCATION_MISMATCH = 'SCAN_LOCATION_MISMATCH',

  // Data Validation Errors
  INVALID_QUANTITY = 'INVALID_QUANTITY',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  DATA_INTEGRITY_VIOLATION = 'DATA_INTEGRITY_VIOLATION',
  CONCURRENT_MODIFICATION = 'CONCURRENT_MODIFICATION',

  // Authorization Errors
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  UNAUTHORIZED_STATUS_CHANGE = 'UNAUTHORIZED_STATUS_CHANGE',
  ROLE_NOT_PERMITTED = 'ROLE_NOT_PERMITTED',

  // System Errors
  DATABASE_CONNECTION_FAILED = 'DATABASE_CONNECTION_FAILED',
  EXTERNAL_SERVICE_UNAVAILABLE = 'EXTERNAL_SERVICE_UNAVAILABLE',
  TIMEOUT_EXCEEDED = 'TIMEOUT_EXCEEDED',
  RESOURCE_LOCKED = 'RESOURCE_LOCKED'
}

/**
 * Error severity levels for proper escalation and handling
 */
export enum KittingErrorSeverity {
  LOW = 'LOW',           // Warning, operation can continue
  MEDIUM = 'MEDIUM',     // Error requires attention but not critical
  HIGH = 'HIGH',         // Critical error affecting operations
  CRITICAL = 'CRITICAL'  // System-wide issue requiring immediate action
}

/**
 * Custom error class for kitting operations
 */
export class KittingError extends Error {
  public readonly type: KittingErrorType;
  public readonly severity: KittingErrorSeverity;
  public readonly context: Record<string, any>;
  public readonly recoverable: boolean;
  public readonly retryable: boolean;
  public readonly userMessage: string;
  public readonly timestamp: Date;

  constructor(
    type: KittingErrorType,
    message: string,
    options: {
      severity?: KittingErrorSeverity;
      context?: Record<string, any>;
      recoverable?: boolean;
      retryable?: boolean;
      userMessage?: string;
      cause?: Error;
    } = {}
  ) {
    super(message);
    this.name = 'KittingError';
    this.type = type;
    this.severity = options.severity || this.getDefaultSeverity(type);
    this.context = options.context || {};
    this.recoverable = options.recoverable ?? this.getDefaultRecoverable(type);
    this.retryable = options.retryable ?? this.getDefaultRetryable(type);
    this.userMessage = options.userMessage || this.getDefaultUserMessage(type);
    this.timestamp = new Date();

    if (options.cause) {
      this.cause = options.cause;
    }

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, KittingError);
    }
  }

  private getDefaultSeverity(type: KittingErrorType): KittingErrorSeverity {
    const severityMap: Record<KittingErrorType, KittingErrorSeverity> = {
      [KittingErrorType.BOM_ANALYSIS_FAILED]: KittingErrorSeverity.HIGH,
      [KittingErrorType.INSUFFICIENT_MATERIALS]: KittingErrorSeverity.HIGH,
      [KittingErrorType.INVALID_WORK_ORDER]: KittingErrorSeverity.MEDIUM,
      [KittingErrorType.BOM_NOT_FOUND]: KittingErrorSeverity.HIGH,
      [KittingErrorType.CIRCULAR_BOM_REFERENCE]: KittingErrorSeverity.CRITICAL,
      [KittingErrorType.STAGING_LOCATION_UNAVAILABLE]: KittingErrorSeverity.MEDIUM,
      [KittingErrorType.STAGING_CAPACITY_EXCEEDED]: KittingErrorSeverity.HIGH,
      [KittingErrorType.INVALID_STAGING_TRANSITION]: KittingErrorSeverity.MEDIUM,
      [KittingErrorType.STAGING_AREA_BLOCKED]: KittingErrorSeverity.HIGH,
      [KittingErrorType.INVALID_STATUS_TRANSITION]: KittingErrorSeverity.MEDIUM,
      [KittingErrorType.KIT_ALREADY_CONSUMED]: KittingErrorSeverity.MEDIUM,
      [KittingErrorType.KIT_NOT_STAGED]: KittingErrorSeverity.MEDIUM,
      [KittingErrorType.KIT_NOT_ISSUED]: KittingErrorSeverity.MEDIUM,
      [KittingErrorType.CRITICAL_SHORTAGE]: KittingErrorSeverity.CRITICAL,
      [KittingErrorType.SHORTAGE_RESOLUTION_FAILED]: KittingErrorSeverity.HIGH,
      [KittingErrorType.SUPPLIER_UNAVAILABLE]: KittingErrorSeverity.HIGH,
      [KittingErrorType.LEAD_TIME_EXCEEDED]: KittingErrorSeverity.MEDIUM,
      [KittingErrorType.VENDOR_REQUEST_FAILED]: KittingErrorSeverity.MEDIUM,
      [KittingErrorType.VENDOR_QUALITY_FAILURE]: KittingErrorSeverity.HIGH,
      [KittingErrorType.VENDOR_DELIVERY_LATE]: KittingErrorSeverity.MEDIUM,
      [KittingErrorType.VENDOR_INSPECTION_FAILED]: KittingErrorSeverity.HIGH,
      [KittingErrorType.VENDOR_CERTIFICATION_MISSING]: KittingErrorSeverity.HIGH,
      [KittingErrorType.INVALID_BARCODE_FORMAT]: KittingErrorSeverity.LOW,
      [KittingErrorType.BARCODE_NOT_FOUND]: KittingErrorSeverity.MEDIUM,
      [KittingErrorType.DUPLICATE_SCAN_ATTEMPT]: KittingErrorSeverity.LOW,
      [KittingErrorType.SCAN_LOCATION_MISMATCH]: KittingErrorSeverity.MEDIUM,
      [KittingErrorType.INVALID_QUANTITY]: KittingErrorSeverity.MEDIUM,
      [KittingErrorType.MISSING_REQUIRED_FIELD]: KittingErrorSeverity.MEDIUM,
      [KittingErrorType.DATA_INTEGRITY_VIOLATION]: KittingErrorSeverity.HIGH,
      [KittingErrorType.CONCURRENT_MODIFICATION]: KittingErrorSeverity.MEDIUM,
      [KittingErrorType.INSUFFICIENT_PERMISSIONS]: KittingErrorSeverity.MEDIUM,
      [KittingErrorType.UNAUTHORIZED_STATUS_CHANGE]: KittingErrorSeverity.HIGH,
      [KittingErrorType.ROLE_NOT_PERMITTED]: KittingErrorSeverity.MEDIUM,
      [KittingErrorType.DATABASE_CONNECTION_FAILED]: KittingErrorSeverity.CRITICAL,
      [KittingErrorType.EXTERNAL_SERVICE_UNAVAILABLE]: KittingErrorSeverity.HIGH,
      [KittingErrorType.TIMEOUT_EXCEEDED]: KittingErrorSeverity.MEDIUM,
      [KittingErrorType.RESOURCE_LOCKED]: KittingErrorSeverity.MEDIUM
    };

    return severityMap[type] || KittingErrorSeverity.MEDIUM;
  }

  private getDefaultRecoverable(type: KittingErrorType): boolean {
    const unrecoverableTypes = [
      KittingErrorType.CIRCULAR_BOM_REFERENCE,
      KittingErrorType.INVALID_WORK_ORDER,
      KittingErrorType.BOM_NOT_FOUND,
      KittingErrorType.DATA_INTEGRITY_VIOLATION,
      KittingErrorType.INSUFFICIENT_PERMISSIONS,
      KittingErrorType.UNAUTHORIZED_STATUS_CHANGE
    ];

    return !unrecoverableTypes.includes(type);
  }

  private getDefaultRetryable(type: KittingErrorType): boolean {
    const retryableTypes = [
      KittingErrorType.DATABASE_CONNECTION_FAILED,
      KittingErrorType.EXTERNAL_SERVICE_UNAVAILABLE,
      KittingErrorType.TIMEOUT_EXCEEDED,
      KittingErrorType.RESOURCE_LOCKED,
      KittingErrorType.STAGING_LOCATION_UNAVAILABLE,
      KittingErrorType.VENDOR_REQUEST_FAILED
    ];

    return retryableTypes.includes(type);
  }

  private getDefaultUserMessage(type: KittingErrorType): string {
    const userMessageMap: Record<KittingErrorType, string> = {
      [KittingErrorType.BOM_ANALYSIS_FAILED]: 'Unable to analyze the Bill of Materials. Please check the BOM structure and try again.',
      [KittingErrorType.INSUFFICIENT_MATERIALS]: 'Insufficient materials available for kit generation. Please check inventory levels.',
      [KittingErrorType.INVALID_WORK_ORDER]: 'The work order is invalid or has been deleted. Please verify the work order details.',
      [KittingErrorType.BOM_NOT_FOUND]: 'Bill of Materials not found for this part. Please create a BOM before generating kits.',
      [KittingErrorType.CIRCULAR_BOM_REFERENCE]: 'Circular reference detected in the Bill of Materials. Please review and fix the BOM structure.',
      [KittingErrorType.STAGING_LOCATION_UNAVAILABLE]: 'No staging location available. Please wait or assign a different staging area.',
      [KittingErrorType.STAGING_CAPACITY_EXCEEDED]: 'Staging area capacity exceeded. Please clear some space before staging more kits.',
      [KittingErrorType.INVALID_STAGING_TRANSITION]: 'Invalid staging transition. Kit cannot be moved to the requested status.',
      [KittingErrorType.STAGING_AREA_BLOCKED]: 'Staging area is blocked or under maintenance. Please use an alternative staging location.',
      [KittingErrorType.INVALID_STATUS_TRANSITION]: 'Invalid status transition. This operation is not allowed for the current kit status.',
      [KittingErrorType.KIT_ALREADY_CONSUMED]: 'Kit has already been consumed and cannot be modified.',
      [KittingErrorType.KIT_NOT_STAGED]: 'Kit must be staged before it can be issued.',
      [KittingErrorType.KIT_NOT_ISSUED]: 'Kit must be issued before it can be consumed.',
      [KittingErrorType.CRITICAL_SHORTAGE]: 'Critical material shortage detected. Immediate action required to resolve supply issues.',
      [KittingErrorType.SHORTAGE_RESOLUTION_FAILED]: 'Failed to resolve material shortage. Please check supplier availability and lead times.',
      [KittingErrorType.SUPPLIER_UNAVAILABLE]: 'Primary supplier is unavailable. Please contact alternative suppliers.',
      [KittingErrorType.LEAD_TIME_EXCEEDED]: 'Material lead time has been exceeded. Expected delivery is delayed.',
      [KittingErrorType.VENDOR_REQUEST_FAILED]: 'Failed to request kit from vendor. Please verify vendor information and try again.',
      [KittingErrorType.VENDOR_QUALITY_FAILURE]: 'Vendor kit failed quality inspection. Please coordinate with vendor for replacement.',
      [KittingErrorType.VENDOR_DELIVERY_LATE]: 'Vendor delivery is late. Please follow up with vendor on delivery status.',
      [KittingErrorType.VENDOR_INSPECTION_FAILED]: 'Vendor kit inspection failed. Please review quality requirements with vendor.',
      [KittingErrorType.VENDOR_CERTIFICATION_MISSING]: 'Required vendor certifications are missing. Please obtain certifications before accepting kit.',
      [KittingErrorType.INVALID_BARCODE_FORMAT]: 'Invalid barcode format. Please check the barcode and scan again.',
      [KittingErrorType.BARCODE_NOT_FOUND]: 'Barcode not found in system. Please verify the barcode is correct.',
      [KittingErrorType.DUPLICATE_SCAN_ATTEMPT]: 'This item has already been scanned. Please proceed with the next item.',
      [KittingErrorType.SCAN_LOCATION_MISMATCH]: 'Scanned item location does not match expected location. Please verify the location.',
      [KittingErrorType.INVALID_QUANTITY]: 'Invalid quantity specified. Please enter a valid positive number.',
      [KittingErrorType.MISSING_REQUIRED_FIELD]: 'Required field is missing. Please complete all required information.',
      [KittingErrorType.DATA_INTEGRITY_VIOLATION]: 'Data integrity violation detected. Please contact system administrator.',
      [KittingErrorType.CONCURRENT_MODIFICATION]: 'Another user has modified this record. Please refresh and try again.',
      [KittingErrorType.INSUFFICIENT_PERMISSIONS]: 'You do not have sufficient permissions to perform this action.',
      [KittingErrorType.UNAUTHORIZED_STATUS_CHANGE]: 'You are not authorized to change the status of this kit.',
      [KittingErrorType.ROLE_NOT_PERMITTED]: 'Your role does not permit this operation. Please contact your supervisor.',
      [KittingErrorType.DATABASE_CONNECTION_FAILED]: 'Database connection failed. Please try again in a moment.',
      [KittingErrorType.EXTERNAL_SERVICE_UNAVAILABLE]: 'External service is currently unavailable. Please try again later.',
      [KittingErrorType.TIMEOUT_EXCEEDED]: 'Operation timed out. Please try again.',
      [KittingErrorType.RESOURCE_LOCKED]: 'Resource is currently locked by another process. Please try again shortly.'
    };

    return userMessageMap[type] || 'An unexpected error occurred. Please try again or contact support.';
  }

  /**
   * Convert error to JSON for logging and API responses
   */
  toJSON() {
    return {
      name: this.name,
      type: this.type,
      message: this.message,
      userMessage: this.userMessage,
      severity: this.severity,
      recoverable: this.recoverable,
      retryable: this.retryable,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack
    };
  }
}

/**
 * Error handler utility class with recovery strategies
 */
export class KittingErrorHandler {
  /**
   * Handle errors with automatic recovery attempts
   */
  static async handleError<T>(
    error: Error | KittingError,
    operation: () => Promise<T>,
    maxRetries: number = 3,
    backoffMs: number = 1000
  ): Promise<T> {
    if (error instanceof KittingError) {
      // Log the error with context
      console.error('Kitting Error:', error.toJSON());

      // If not retryable, throw immediately
      if (!error.retryable) {
        throw error;
      }

      // Attempt recovery if possible
      if (error.recoverable) {
        return this.retryWithBackoff(operation, maxRetries, backoffMs);
      }
    }

    // For non-kitting errors, wrap and throw
    if (!(error instanceof KittingError)) {
      throw new KittingError(
        KittingErrorType.DATABASE_CONNECTION_FAILED,
        error.message,
        {
          cause: error,
          context: { originalErrorType: error.constructor.name }
        }
      );
    }

    throw error;
  }

  /**
   * Retry operation with exponential backoff
   */
  private static async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number,
    baseBackoffMs: number
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt === maxRetries) {
          break;
        }

        // Exponential backoff with jitter
        const backoffMs = baseBackoffMs * Math.pow(2, attempt - 1);
        const jitter = Math.random() * 0.1 * backoffMs;
        await new Promise(resolve => setTimeout(resolve, backoffMs + jitter));

        console.warn(`Retry attempt ${attempt}/${maxRetries} failed:`, error);
      }
    }

    throw lastError!;
  }

  /**
   * Create kit-specific errors with appropriate context
   */
  static createKitError(
    type: KittingErrorType,
    message: string,
    kitId?: string,
    workOrderId?: string,
    additionalContext?: Record<string, any>
  ): KittingError {
    return new KittingError(type, message, {
      context: {
        kitId,
        workOrderId,
        ...additionalContext
      }
    });
  }

  /**
   * Create vendor kit-specific errors
   */
  static createVendorKitError(
    type: KittingErrorType,
    message: string,
    vendorKitId?: string,
    vendorId?: string,
    additionalContext?: Record<string, any>
  ): KittingError {
    return new KittingError(type, message, {
      context: {
        vendorKitId,
        vendorId,
        ...additionalContext
      }
    });
  }

  /**
   * Create staging-specific errors
   */
  static createStagingError(
    type: KittingErrorType,
    message: string,
    stagingLocationId?: string,
    kitId?: string,
    additionalContext?: Record<string, any>
  ): KittingError {
    return new KittingError(type, message, {
      context: {
        stagingLocationId,
        kitId,
        ...additionalContext
      }
    });
  }

  /**
   * Create barcode/scanning errors
   */
  static createScanningError(
    type: KittingErrorType,
    message: string,
    barcode?: string,
    expectedLocation?: string,
    actualLocation?: string,
    additionalContext?: Record<string, any>
  ): KittingError {
    return new KittingError(type, message, {
      context: {
        barcode,
        expectedLocation,
        actualLocation,
        ...additionalContext
      }
    });
  }
}

/**
 * Circuit breaker pattern for external service calls
 */
export class KittingCircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private readonly failureThreshold: number = 5,
    private readonly recoveryTimeoutMs: number = 60000
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime < this.recoveryTimeoutMs) {
        throw new KittingError(
          KittingErrorType.EXTERNAL_SERVICE_UNAVAILABLE,
          'Circuit breaker is OPEN - service unavailable',
          {
            severity: KittingErrorSeverity.HIGH,
            context: {
              state: this.state,
              failures: this.failures,
              lastFailureTime: this.lastFailureTime
            }
          }
        );
      } else {
        this.state = 'HALF_OPEN';
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  getState(): { state: string; failures: number; lastFailureTime: number } {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime
    };
  }
}

/**
 * Utility functions for error validation and transformation
 */
export const KittingErrorUtils = {
  /**
   * Check if an error is a kitting error
   */
  isKittingError(error: any): error is KittingError {
    return error instanceof KittingError;
  },

  /**
   * Check if an error is recoverable
   */
  isRecoverable(error: any): boolean {
    return this.isKittingError(error) && error.recoverable;
  },

  /**
   * Check if an error is retryable
   */
  isRetryable(error: any): boolean {
    return this.isKittingError(error) && error.retryable;
  },

  /**
   * Get error severity
   */
  getSeverity(error: any): KittingErrorSeverity {
    if (this.isKittingError(error)) {
      return error.severity;
    }
    return KittingErrorSeverity.MEDIUM;
  },

  /**
   * Convert any error to a kitting error
   */
  toKittingError(error: any, fallbackType: KittingErrorType = KittingErrorType.DATABASE_CONNECTION_FAILED): KittingError {
    if (this.isKittingError(error)) {
      return error;
    }

    return new KittingError(fallbackType, error?.message || 'Unknown error', {
      cause: error,
      context: {
        originalErrorType: error?.constructor?.name || 'Unknown',
        originalStack: error?.stack
      }
    });
  }
};

export default {
  KittingError,
  KittingErrorHandler,
  KittingCircuitBreaker,
  KittingErrorUtils,
  KittingErrorType,
  KittingErrorSeverity
};