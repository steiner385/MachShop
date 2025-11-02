/**
 * Integration Adapter Registry
 * Central discovery, registration, and lifecycle management for all adapters
 */

import { BaseIntegrationConnector } from './BaseIntegrationConnector';
import {
  ConnectorConfig,
  AdapterManifest,
  AdapterApprovalRequest,
  ApprovalStep,
  CompatibilityCheckResult,
} from '../types';

/**
 * Registered adapter information
 */
interface RegisteredAdapter {
  manifest: AdapterManifest;
  connectorClass: typeof BaseIntegrationConnector;
  instances: Map<string, BaseIntegrationConnector>;
  enabled: boolean;
  registeredAt: Date;
  registeredBy: string;
}

/**
 * Central registry for managing all integration adapters
 * Handles discovery, instantiation, lifecycle, and governance
 */
export class IntegrationAdapterRegistry {
  private adapters: Map<string, RegisteredAdapter> = new Map();
  private approvalRequests: Map<string, AdapterApprovalRequest> = new Map();
  private compatibilityCache: Map<string, CompatibilityCheckResult[]> = new Map();
  private listeners: Map<string, Function[]> = new Map();

  /**
   * Register a new adapter
   */
  registerAdapter(
    manifest: AdapterManifest,
    connectorClass: typeof BaseIntegrationConnector,
    registeredBy: string = 'system'
  ): void {
    if (this.adapters.has(manifest.id)) {
      throw new Error(`Adapter ${manifest.id} is already registered`);
    }

    const registered: RegisteredAdapter = {
      manifest,
      connectorClass,
      instances: new Map(),
      enabled: true,
      registeredAt: new Date(),
      registeredBy,
    };

    this.adapters.set(manifest.id, registered);
    this.emit('adapter-registered', { adapterId: manifest.id, manifest });
  }

  /**
   * Unregister an adapter
   */
  unregisterAdapter(adapterId: string): void {
    const adapter = this.adapters.get(adapterId);
    if (!adapter) {
      throw new Error(`Adapter ${adapterId} not found`);
    }

    // Disconnect all instances
    for (const instance of adapter.instances.values()) {
      instance.disconnect().catch((error) => {
        console.error(`Failed to disconnect adapter instance: ${error}`);
      });
    }

    this.adapters.delete(adapterId);
    this.emit('adapter-unregistered', { adapterId });
  }

  /**
   * Get registered adapter manifest
   */
  getAdapterManifest(adapterId: string): AdapterManifest | undefined {
    return this.adapters.get(adapterId)?.manifest;
  }

  /**
   * List all registered adapters
   */
  listAdapters(): AdapterManifest[] {
    return Array.from(this.adapters.values()).map((a) => a.manifest);
  }

  /**
   * Enable an adapter
   */
  enableAdapter(adapterId: string): void {
    const adapter = this.adapters.get(adapterId);
    if (!adapter) {
      throw new Error(`Adapter ${adapterId} not found`);
    }
    adapter.enabled = true;
    this.emit('adapter-enabled', { adapterId });
  }

  /**
   * Disable an adapter
   */
  disableAdapter(adapterId: string): void {
    const adapter = this.adapters.get(adapterId);
    if (!adapter) {
      throw new Error(`Adapter ${adapterId} not found`);
    }
    adapter.enabled = false;
    this.emit('adapter-disabled', { adapterId });
  }

  /**
   * Create connector instance
   */
  createConnectorInstance(
    adapterId: string,
    config: ConnectorConfig
  ): BaseIntegrationConnector {
    const adapter = this.adapters.get(adapterId);
    if (!adapter) {
      throw new Error(`Adapter ${adapterId} not found`);
    }
    if (!adapter.enabled) {
      throw new Error(`Adapter ${adapterId} is disabled`);
    }

    const instance = new adapter.connectorClass(config);
    adapter.instances.set(config.id, instance);

    this.emit('connector-created', { adapterId, connectorId: config.id });
    return instance;
  }

  /**
   * Get connector instance
   */
  getConnectorInstance(adapterId: string, connectorId: string): BaseIntegrationConnector | undefined {
    const adapter = this.adapters.get(adapterId);
    return adapter?.instances.get(connectorId);
  }

  /**
   * List connector instances for adapter
   */
  listConnectorInstances(adapterId: string): BaseIntegrationConnector[] {
    const adapter = this.adapters.get(adapterId);
    if (!adapter) {
      return [];
    }
    return Array.from(adapter.instances.values());
  }

  /**
   * Delete connector instance
   */
  deleteConnectorInstance(adapterId: string, connectorId: string): void {
    const adapter = this.adapters.get(adapterId);
    if (!adapter) {
      throw new Error(`Adapter ${adapterId} not found`);
    }

    const instance = adapter.instances.get(connectorId);
    if (instance) {
      instance.disconnect().catch((error) => {
        console.error(`Failed to disconnect: ${error}`);
      });
    }

    adapter.instances.delete(connectorId);
    this.emit('connector-deleted', { adapterId, connectorId });
  }

  /**
   * Request approval for new adapter
   */
  requestApproval(
    adapterId: string,
    manifest: AdapterManifest,
    requestedBy: string
  ): AdapterApprovalRequest {
    const request: AdapterApprovalRequest = {
      id: `approval-${Date.now()}`,
      adapterId,
      requestedBy,
      requestedAt: new Date(),
      manifest,
      compatibilityChecks: this.runCompatibilityChecks(manifest),
      status: 'pending',
      approvalChain: [
        { role: 'analyst', status: 'pending' },
        { role: 'manager', status: 'pending' },
        { role: 'architect', status: 'pending' },
        { role: 'admin', status: 'pending' },
      ],
    };

    this.approvalRequests.set(request.id, request);
    this.emit('approval-requested', { requestId: request.id, adapterId });

    return request;
  }

  /**
   * Approve adapter in approval chain
   */
  approveAdapter(
    requestId: string,
    role: 'analyst' | 'manager' | 'architect' | 'admin',
    approvedBy: string,
    comments?: string
  ): void {
    const request = this.approvalRequests.get(requestId);
    if (!request) {
      throw new Error(`Approval request ${requestId} not found`);
    }

    const step = request.approvalChain.find((s) => s.role === role);
    if (!step) {
      throw new Error(`Role ${role} not in approval chain`);
    }

    step.status = 'approved';
    step.approvedBy = approvedBy;
    step.approvedAt = new Date();
    step.comments = comments;

    // Check if all steps are approved
    if (request.approvalChain.every((s) => s.status === 'approved')) {
      request.status = 'approved';
      this.emit('adapter-approved', { requestId, adapterId: request.adapterId });
    } else {
      this.emit('approval-step-completed', { requestId, role, approvedBy });
    }
  }

  /**
   * Reject adapter in approval chain
   */
  rejectAdapter(
    requestId: string,
    role: 'analyst' | 'manager' | 'architect' | 'admin',
    rejectedBy: string,
    reason: string
  ): void {
    const request = this.approvalRequests.get(requestId);
    if (!request) {
      throw new Error(`Approval request ${requestId} not found`);
    }

    const step = request.approvalChain.find((s) => s.role === role);
    if (!step) {
      throw new Error(`Role ${role} not in approval chain`);
    }

    step.status = 'rejected';
    step.approvedBy = rejectedBy;
    step.approvedAt = new Date();
    request.status = 'rejected';
    request.rejectionReason = reason;

    this.emit('adapter-rejected', { requestId, adapterId: request.adapterId, reason });
  }

  /**
   * Get approval request
   */
  getApprovalRequest(requestId: string): AdapterApprovalRequest | undefined {
    return this.approvalRequests.get(requestId);
  }

  /**
   * List pending approvals
   */
  listPendingApprovals(): AdapterApprovalRequest[] {
    return Array.from(this.approvalRequests.values()).filter((r) => r.status === 'pending');
  }

  /**
   * Run compatibility checks
   */
  private runCompatibilityChecks(manifest: AdapterManifest): CompatibilityCheckResult[] {
    const checks: CompatibilityCheckResult[] = [];

    // Check dependencies
    if (manifest.dependencies.required) {
      for (const [dep, version] of Object.entries(manifest.dependencies.required)) {
        checks.push({
          checkType: 'dependency',
          passed: this.checkDependencyVersion(dep, version),
          message: `Dependency ${dep}@${version}`,
          details: { dependency: dep, requiredVersion: version },
        });
      }
    }

    // Check API version compatibility
    checks.push({
      checkType: 'api-version',
      passed: this.isApiVersionCompatible(manifest.apiVersion),
      message: `API version ${manifest.apiVersion}`,
      details: { apiVersion: manifest.apiVersion },
    });

    // Check authentication support
    for (const authType of manifest.provides.authentication) {
      checks.push({
        checkType: 'authentication',
        passed: true, // Assume we support all auth types
        message: `Authentication type ${authType}`,
        details: { authType },
      });
    }

    return checks;
  }

  /**
   * Check if dependency version is available
   */
  private checkDependencyVersion(dependency: string, version: string): boolean {
    // Simplified check - in production, check against actual installed versions
    return true;
  }

  /**
   * Check API version compatibility
   */
  private isApiVersionCompatible(apiVersion: string): boolean {
    // Simplified check - support versions >= 1.0.0
    const [major] = apiVersion.split('.');
    return parseInt(major, 10) >= 1;
  }

  /**
   * Subscribe to registry events
   */
  subscribe(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  /**
   * Unsubscribe from registry events
   */
  unsubscribe(event: string, callback: Function): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to listeners
   */
  private emit(event: string, data: unknown): void {
    const callbacks = this.listeners.get(event) || [];
    for (const callback of callbacks) {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    }
  }

  /**
   * Get registry statistics
   */
  getStatistics(): {
    totalAdapters: number;
    enabledAdapters: number;
    totalConnectors: number;
    pendingApprovals: number;
  } {
    let totalConnectors = 0;
    for (const adapter of this.adapters.values()) {
      totalConnectors += adapter.instances.size;
    }

    return {
      totalAdapters: this.adapters.size,
      enabledAdapters: Array.from(this.adapters.values()).filter((a) => a.enabled).length,
      totalConnectors,
      pendingApprovals: Array.from(this.approvalRequests.values()).filter(
        (r) => r.status === 'pending'
      ).length,
    };
  }

  /**
   * Clear all data (for testing)
   */
  clear(): void {
    this.adapters.clear();
    this.approvalRequests.clear();
    this.compatibilityCache.clear();
  }
}

// Singleton instance
export const integrationRegistry = new IntegrationAdapterRegistry();
