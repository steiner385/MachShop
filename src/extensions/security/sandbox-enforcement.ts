/**
 * Extension Sandbox Enforcement
 * Implements isolation and resource control for extensions
 * Issue #437: Extension Security Model & Sandboxing
 */

import {
  ExtensionSecurityContext,
  ExtensionSecurityManager,
  ExtensionPermission,
  SandboxEnforcementResult,
  ExtensionResourceUsage
} from './extension-security-model';

/**
 * Sandbox isolation levels
 */
export enum IsolationLevel {
  NONE = 'NONE', // No isolation (trusted extensions only)
  PARTIAL = 'PARTIAL', // Limited isolation with permission controls
  FULL = 'FULL' // Complete process isolation with container/VM
}

/**
 * Sandbox environment configuration
 */
export interface SandboxConfig {
  isolationLevel: IsolationLevel;
  memoryLimitMB: number;
  cpuLimitPercent: number;
  diskQuotaMB: number;
  timeoutMs: number;
  allowedDomains: string[];
  allowedPaths: string[];
  blockSystemAccess: boolean;
  enableNetworking: boolean;
  enableFileIO: boolean;
}

/**
 * Resource monitor for tracking extension resource usage
 */
export class ResourceMonitor {
  private startTime: number;
  private initialMemory: number;
  private startCPUTime: number;
  private bytesReadWritten: number = 0;
  private networkBytesIn: number = 0;
  private networkBytesOut: number = 0;
  private requestCount: number = 0;
  private errorCount: number = 0;

  constructor(private config: SandboxConfig) {
    this.startTime = Date.now();
    this.initialMemory = this.getCurrentMemoryMB();
    this.startCPUTime = this.getCPUTimeMicros();
  }

  /**
   * Record operation execution
   */
  recordOperation(type: 'request' | 'error' | 'fileio' | 'network'): void {
    if (type === 'request') {
      this.requestCount++;
    } else if (type === 'error') {
      this.errorCount++;
    }
  }

  /**
   * Record file IO usage
   */
  recordFileIO(bytesCount: number): void {
    this.bytesReadWritten += bytesCount;
    this.enforceQuota();
  }

  /**
   * Record network usage
   */
  recordNetworkUsage(bytesIn: number, bytesOut: number): void {
    this.networkBytesIn += bytesIn;
    this.networkBytesOut += bytesOut;
  }

  /**
   * Get current resource usage
   */
  getResourceUsage(): ExtensionResourceUsage {
    const now = Date.now();
    const executionTimeMs = now - this.startTime;
    const memoryUsedMB = this.getCurrentMemoryMB() - this.initialMemory;
    const cpuPercentage = this.calculateCPUUsage();

    return {
      extensionId: '', // Will be set by caller
      timestamp: new Date(),
      memoryUsedMB: Math.max(0, memoryUsedMB),
      cpuPercentage,
      diskUsedMB: this.bytesReadWritten / (1024 * 1024),
      networkBytesOut: this.networkBytesOut,
      networkBytesIn: this.networkBytesIn,
      executionTimeMs,
      requestCount: this.requestCount,
      errorCount: this.errorCount
    };
  }

  /**
   * Check if resource limits exceeded
   */
  checkLimits(): { exceeded: boolean; reasons: string[] } {
    const reasons: string[] = [];
    const usage = this.getResourceUsage();
    const now = Date.now() - this.startTime;

    if (usage.memoryUsedMB > this.config.memoryLimitMB) {
      reasons.push(
        `Memory limit exceeded: ${usage.memoryUsedMB}MB > ${this.config.memoryLimitMB}MB`
      );
    }

    if (usage.cpuPercentage > this.config.cpuLimitPercent) {
      reasons.push(
        `CPU limit exceeded: ${usage.cpuPercentage.toFixed(1)}% > ${this.config.cpuLimitPercent}%`
      );
    }

    if (usage.diskUsedMB > this.config.diskQuotaMB) {
      reasons.push(
        `Disk quota exceeded: ${usage.diskUsedMB}MB > ${this.config.diskQuotaMB}MB`
      );
    }

    if (now > this.config.timeoutMs) {
      reasons.push(
        `Execution timeout exceeded: ${now}ms > ${this.config.timeoutMs}ms`
      );
    }

    return {
      exceeded: reasons.length > 0,
      reasons
    };
  }

  /**
   * Get current memory usage in MB
   */
  private getCurrentMemoryMB(): number {
    // In a real implementation, this would use process.memoryUsage() or container metrics
    // For now, return a placeholder
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed / (1024 * 1024);
    }
    return 0;
  }

  /**
   * Get CPU time in microseconds
   */
  private getCPUTimeMicros(): number {
    // In a real implementation, this would use os.cpus() or process.cpuUsage()
    // For now, return a placeholder
    if (typeof process !== 'undefined' && process.cpuUsage) {
      const usage = process.cpuUsage();
      return usage.user + usage.system;
    }
    return 0;
  }

  /**
   * Calculate CPU usage percentage
   */
  private calculateCPUUsage(): number {
    const elapsedMicros = this.getCPUTimeMicros() - this.startCPUTime;
    const elapsedMs = Date.now() - this.startTime;
    // Simplified calculation: (CPU micros / elapsed micros) * 100
    return Math.min(100, (elapsedMicros / (elapsedMs * 1000)) * 100);
  }

  /**
   * Enforce disk quota
   */
  private enforceQuota(): void {
    if (this.bytesReadWritten / (1024 * 1024) > this.config.diskQuotaMB) {
      throw new Error('Disk quota exceeded');
    }
  }
}

/**
 * Permission enforcer for extension operations
 */
export class PermissionEnforcer {
  constructor(
    private securityManager: ExtensionSecurityManager,
    private extensionId: string
  ) {}

  /**
   * Enforce permission for operation
   */
  enforcePermission(
    permission: ExtensionPermission,
    operationDescription: string
  ): void {
    if (!this.securityManager.checkPermission(this.extensionId, permission)) {
      throw new ExtensionPermissionDeniedError(
        `Permission denied: ${permission} for operation: ${operationDescription}`
      );
    }
  }

  /**
   * Enforce multiple permissions (all required)
   */
  enforceAllPermissions(
    permissions: ExtensionPermission[],
    operationDescription: string
  ): void {
    for (const permission of permissions) {
      this.enforcePermission(permission, operationDescription);
    }
  }

  /**
   * Enforce any of multiple permissions (at least one required)
   */
  enforceAnyPermission(
    permissions: ExtensionPermission[],
    operationDescription: string
  ): void {
    const hasAny = permissions.some(p =>
      this.securityManager.checkPermission(this.extensionId, p)
    );

    if (!hasAny) {
      throw new ExtensionPermissionDeniedError(
        `Permission denied: requires one of [${permissions.join(', ')}] for operation: ${operationDescription}`
      );
    }
  }
}

/**
 * Network access controller
 */
export class NetworkAccessController {
  private whitelistedDomains: Set<string>;

  constructor(config: SandboxConfig) {
    this.whitelistedDomains = new Set(config.allowedDomains);
  }

  /**
   * Check if network access is allowed
   */
  isNetworkAccessAllowed(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;

      // Check exact matches
      if (this.whitelistedDomains.has(hostname)) {
        return true;
      }

      // Check wildcard matches (*.example.com)
      for (const domain of this.whitelistedDomains) {
        if (domain.startsWith('*.')) {
          const baseDomain = domain.substring(2);
          if (hostname.endsWith(baseDomain)) {
            return true;
          }
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Sanitize URL for network request
   */
  sanitizeURL(url: string): string {
    // Remove sensitive headers and credentials
    // This is a simplified version - real implementation would be more comprehensive
    return url.split('#')[0]; // Remove fragments
  }
}

/**
 * File access controller
 */
export class FileAccessController {
  private allowedPaths: Set<string>;

  constructor(config: SandboxConfig) {
    this.allowedPaths = new Set(config.allowedPaths);
  }

  /**
   * Check if file access is allowed
   */
  isFileAccessAllowed(path: string, type: 'read' | 'write' | 'delete'): boolean {
    // Normalize path
    const normalizedPath = this.normalizePath(path);

    // Check against whitelist
    for (const allowedPath of this.allowedPaths) {
      if (this.pathMatches(normalizedPath, allowedPath)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Normalize file path
   */
  private normalizePath(path: string): string {
    // Remove ../ and ./ and normalize separators
    return path.replace(/\.\.\//g, '').replace(/\.\//g, '');
  }

  /**
   * Check if path matches allowed path
   */
  private pathMatches(path: string, allowedPath: string): boolean {
    if (allowedPath.endsWith('/*')) {
      const basePath = allowedPath.substring(0, allowedPath.length - 2);
      return path.startsWith(basePath);
    }
    return path === allowedPath;
  }
}

/**
 * Sandbox executor for extension code
 */
export class SandboxExecutor {
  private resourceMonitor: ResourceMonitor;
  private permissionEnforcer: PermissionEnforcer;
  private networkController: NetworkAccessController;
  private fileController: FileAccessController;

  constructor(
    private extensionId: string,
    private context: ExtensionSecurityContext,
    private securityManager: ExtensionSecurityManager,
    private config: SandboxConfig
  ) {
    this.resourceMonitor = new ResourceMonitor(config);
    this.permissionEnforcer = new PermissionEnforcer(
      securityManager,
      extensionId
    );
    this.networkController = new NetworkAccessController(config);
    this.fileController = new FileAccessController(config);
  }

  /**
   * Execute function within sandbox
   */
  async executeWithSandbox<T>(
    fn: () => Promise<T>
  ): Promise<T> {
    try {
      // Enforce security context before execution
      const enforcementResult = this.securityManager.enforceSecurityContext(
        this.extensionId
      );
      if (!enforcementResult.allowed) {
        throw new SandboxViolationError(
          `Sandbox violation: ${enforcementResult.reason}`
        );
      }

      // Execute function
      const result = await Promise.race([
        fn(),
        this.createTimeoutPromise<T>()
      ]);

      // Check resource limits
      const limitCheck = this.resourceMonitor.checkLimits();
      if (limitCheck.exceeded) {
        throw new ResourceLimitExceededError(
          `Resource limits exceeded: ${limitCheck.reasons.join('; ')}`
        );
      }

      // Record successful execution
      this.recordResourceUsage();
      this.resourceMonitor.recordOperation('request');

      return result;
    } catch (error) {
      this.resourceMonitor.recordOperation('error');
      throw error;
    }
  }

  /**
   * Check network access
   */
  checkNetworkAccess(url: string): void {
    if (!this.config.enableNetworking) {
      throw new NetworkAccessDeniedError('Network access is disabled');
    }

    if (!this.networkController.isNetworkAccessAllowed(url)) {
      throw new NetworkAccessDeniedError(
        `Network access denied for URL: ${url}`
      );
    }

    this.permissionEnforcer.enforcePermission(
      ExtensionPermission.NETWORK_ACCESS,
      `Network request to ${url}`
    );
  }

  /**
   * Check file access
   */
  checkFileAccess(path: string, type: 'read' | 'write' | 'delete'): void {
    if (!this.config.enableFileIO) {
      throw new FileAccessDeniedError('File access is disabled');
    }

    if (!this.fileController.isFileAccessAllowed(path, type)) {
      throw new FileAccessDeniedError(
        `File access denied for path: ${path} (${type})`
      );
    }

    const permissionMap = {
      read: ExtensionPermission.FILE_DOWNLOAD,
      write: ExtensionPermission.FILE_UPLOAD,
      delete: ExtensionPermission.FILE_UPLOAD // Same as write for delete
    };

    this.permissionEnforcer.enforcePermission(
      permissionMap[type],
      `File ${type} operation on ${path}`
    );
  }

  /**
   * Create timeout promise
   */
  private createTimeoutPromise<T>(): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(
          new ExecutionTimeoutError(
            `Execution timeout after ${this.config.timeoutMs}ms`
          )
        );
      }, this.config.timeoutMs);
    });
  }

  /**
   * Record resource usage
   */
  private recordResourceUsage(): void {
    const usage = this.resourceMonitor.getResourceUsage();
    usage.extensionId = this.extensionId;
    this.securityManager.recordResourceUsage(usage);
  }

  /**
   * Get current resource usage
   */
  getResourceUsage(): ExtensionResourceUsage {
    const usage = this.resourceMonitor.getResourceUsage();
    usage.extensionId = this.extensionId;
    return usage;
  }
}

/**
 * Custom error types for sandbox violations
 */
export class SandboxViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SandboxViolationError';
  }
}

export class ExtensionPermissionDeniedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExtensionPermissionDeniedError';
  }
}

export class ResourceLimitExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ResourceLimitExceededError';
  }
}

export class NetworkAccessDeniedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkAccessDeniedError';
  }
}

export class FileAccessDeniedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileAccessDeniedError';
  }
}

export class ExecutionTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExecutionTimeoutError';
  }
}
