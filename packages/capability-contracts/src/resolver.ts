/**
 * Default capability resolver instance and convenience functions
 */

import { CapabilityRegistry } from './registry';
import { CapabilityContract, CapabilityDependency } from './types';

/**
 * Default global capability registry instance
 * Pre-loaded with all built-in capability contracts
 */
export const capabilityRegistry = new CapabilityRegistry();

/**
 * Get a capability contract by ID from the default registry
 */
export function getCapabilityContract(id: string): CapabilityContract | undefined {
  return capabilityRegistry.getContract(id);
}

/**
 * List all capability contracts from the default registry
 */
export function listCapabilities(): CapabilityContract[] {
  return capabilityRegistry.listContracts();
}

/**
 * Find all providers for a capability
 */
export function findProvidersFor(capabilityId: string): string[] {
  return capabilityRegistry.getProvidersFor(capabilityId);
}

/**
 * Resolve a capability dependency at a site
 */
export function resolveCapability(
  siteId: string,
  dependency: CapabilityDependency
) {
  return capabilityRegistry.resolveDependency(siteId, dependency);
}
