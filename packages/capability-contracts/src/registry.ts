/**
 * Capability Registry - Central registry for capability discovery and resolution
 */

import {
  CapabilityContract,
  CapabilityProvides,
  CapabilityDependency,
  CapabilityPolicy,
} from './types';
import {
  ALL_CAPABILITY_CONTRACTS,
  getCapabilityContractById,
  getAllCapabilityContracts,
} from './contracts';

/**
 * Result of resolving a version constraint
 */
export interface VersionResolution {
  satisfied: boolean;
  reason?: string;
  availableVersions?: string[];
}

/**
 * Result of resolving a provider for a capability
 */
export interface ProviderResolution {
  found: boolean;
  providerId?: string;
  version?: string;
  reason?: string;
  alternativeProviders?: string[];
}

/**
 * Result of resolving a capability dependency
 */
export interface CapabilityResolution {
  capability: string;
  resolved: boolean;
  provider?: ProviderResolution;
  version?: VersionResolution;
  reason?: string;
}

/**
 * Capability Registry
 * Manages contract discovery, version resolution, and provider matching
 */
export class CapabilityRegistry {
  private contracts: Map<string, CapabilityContract> = new Map();
  private providers: Map<string, Set<string>> = new Map(); // capability -> providers
  private providerCapabilities: Map<string, Set<string>> = new Map(); // provider -> capabilities

  constructor(contracts?: CapabilityContract[]) {
    // Load default contracts
    for (const contract of getAllCapabilityContracts()) {
      this.registerContract(contract);
    }

    // Load additional contracts if provided
    if (contracts) {
      for (const contract of contracts) {
        this.registerContract(contract);
      }
    }
  }

  /**
   * Register a capability contract
   */
  registerContract(contract: CapabilityContract): void {
    this.contracts.set(contract.id, contract);

    // Track providers for this capability
    if (!this.providers.has(contract.id)) {
      this.providers.set(contract.id, new Set());
    }

    if (contract.knownProviders) {
      for (const provider of contract.knownProviders) {
        this.providers.get(contract.id)!.add(provider);

        // Track capability for provider
        if (!this.providerCapabilities.has(provider)) {
          this.providerCapabilities.set(provider, new Set());
        }
        this.providerCapabilities.get(provider)!.add(contract.id);
      }
    }
  }

  /**
   * Get a capability contract by ID
   */
  getContract(id: string): CapabilityContract | undefined {
    return this.contracts.get(id);
  }

  /**
   * List all capability contracts
   */
  listContracts(): CapabilityContract[] {
    return Array.from(this.contracts.values());
  }

  /**
   * Find contracts matching criteria
   */
  findContracts(predicate: (contract: CapabilityContract) => boolean): CapabilityContract[] {
    return this.listContracts().filter(predicate);
  }

  /**
   * Get all providers for a capability
   */
  getProvidersFor(capabilityId: string): string[] {
    const contract = this.getContract(capabilityId);
    if (!contract) return [];
    return contract.knownProviders || [];
  }

  /**
   * Get capabilities provided by an extension
   */
  getCapabilitiesProvidedBy(extensionId: string): string[] {
    const capabilities = this.providerCapabilities.get(extensionId);
    return capabilities ? Array.from(capabilities) : [];
  }

  /**
   * Get default provider for a capability
   */
  getDefaultProvider(capabilityId: string): string | undefined {
    const contract = this.getContract(capabilityId);
    return contract?.defaultProvider;
  }

  /**
   * Validate a version constraint
   * Simple SemVer matching - can be enhanced with proper semver library
   */
  validateVersionConstraint(
    availableVersion: string,
    constraint?: string
  ): VersionResolution {
    if (!constraint) {
      return { satisfied: true };
    }

    // Simple implementation - just check if available version starts with constraint
    // In production, use semver library for proper range matching
    if (availableVersion.startsWith(constraint.replace(/^[v^~><=]+/, ''))) {
      return { satisfied: true };
    }

    return {
      satisfied: false,
      reason: `Version ${availableVersion} does not match constraint ${constraint}`,
      availableVersions: [availableVersion],
    };
  }

  /**
   * Resolve a provider for a capability at a site
   * @param siteId - Site ID for site-specific provider selection
   * @param capabilityId - Capability ID
   * @param preferredProvider - Optional preferred provider
   * @returns Provider resolution
   */
  resolveProvider(
    siteId: string,
    capabilityId: string,
    preferredProvider?: string
  ): ProviderResolution {
    const contract = this.getContract(capabilityId);
    if (!contract) {
      return {
        found: false,
        reason: `Capability "${capabilityId}" not found in registry`,
      };
    }

    const providers = this.getProvidersFor(capabilityId);
    if (providers.length === 0) {
      return {
        found: false,
        reason: `No providers found for capability "${capabilityId}"`,
      };
    }

    // If preferred provider is specified, check if it's available
    if (preferredProvider) {
      if (providers.includes(preferredProvider)) {
        return {
          found: true,
          providerId: preferredProvider,
        };
      }
      return {
        found: false,
        reason: `Preferred provider "${preferredProvider}" not available for capability "${capabilityId}"`,
        alternativeProviders: providers,
      };
    }

    // Use default provider if available
    const defaultProvider = this.getDefaultProvider(capabilityId);
    if (defaultProvider && providers.includes(defaultProvider)) {
      return {
        found: true,
        providerId: defaultProvider,
      };
    }

    // Fall back to first available provider
    return {
      found: true,
      providerId: providers[0],
    };
  }

  /**
   * Resolve a capability dependency
   * Checks if capability exists, has available providers, version constraints
   */
  resolveDependency(
    siteId: string,
    dependency: CapabilityDependency
  ): CapabilityResolution {
    const contract = this.getContract(dependency.capability);
    if (!contract) {
      return {
        capability: dependency.capability,
        resolved: false,
        reason: `Capability "${dependency.capability}" not found`,
      };
    }

    // Resolve provider
    const providerResolution = this.resolveProvider(
      siteId,
      dependency.capability,
      dependency.provider
    );

    if (!providerResolution.found) {
      return {
        capability: dependency.capability,
        resolved: false,
        provider: providerResolution,
        reason: providerResolution.reason,
      };
    }

    // Resolve version constraint
    const versionResolution = this.validateVersionConstraint(
      contract.version,
      dependency.minVersion
    );

    if (!versionResolution.satisfied) {
      return {
        capability: dependency.capability,
        resolved: false,
        provider: providerResolution,
        version: versionResolution,
        reason: versionResolution.reason,
      };
    }

    return {
      capability: dependency.capability,
      resolved: true,
      provider: providerResolution,
      version: versionResolution,
    };
  }

  /**
   * Resolve multiple dependencies at once
   */
  resolveDependencies(
    siteId: string,
    dependencies: CapabilityDependency[]
  ): CapabilityResolution[] {
    return dependencies.map(dep => this.resolveDependency(siteId, dep));
  }

  /**
   * Get policies for a capability
   */
  getPolicies(capabilityId: string): CapabilityPolicy[] {
    const contract = this.getContract(capabilityId);
    return contract?.policies || [];
  }

  /**
   * Check if two policies conflict
   */
  checkPolicyConflict(
    capabilityId: string,
    policy1: string,
    policy2: string
  ): boolean {
    const contract = this.getContract(capabilityId);
    if (!contract) return false;

    const policies = contract.policies || [];
    const policy1Def = policies.find(p => p.id === policy1);
    const policy2Def = policies.find(p => p.id === policy2);

    if (!policy1Def || !policy2Def) return false;

    // Check incompatibilities
    const incomp = contract.incompatibilities || [];
    return incomp.some(
      incompatibility =>
        incompatibility.capability === capabilityId &&
        incompatibility.policy &&
        ((incompatibility.policy === policy1 && policy2 in (incompatibility as any)) ||
          (incompatibility.policy === policy2 && policy1 in (incompatibility as any)))
    );
  }

  /**
   * Get compliance requirements for a capability
   */
  getComplianceRequirements(capabilityId: string) {
    const contract = this.getContract(capabilityId);
    return contract?.compliance;
  }

  /**
   * Get all capabilities by foundation tier
   */
  getCapabilitysByTier(tier: 'core-foundation' | 'foundation' | 'application'): CapabilityContract[] {
    return this.findContracts(c => c.foundationTier === tier);
  }

  /**
   * Get incompatibilities for a capability
   */
  getIncompatibilities(
    capabilityId: string
  ): Array<{ capability?: string; policy?: string; reason: string; scope: string }> {
    const contract = this.getContract(capabilityId);
    return contract?.incompatibilities || [];
  }

  /**
   * Check if capability is in foundation tier (requires special handling)
   */
  isFoundationTierCapability(capabilityId: string): boolean {
    const contract = this.getContract(capabilityId);
    return contract?.foundationTier === 'core-foundation' || contract?.foundationTier === 'foundation';
  }
}

/**
 * Default global capability registry instance
 */
export const capabilityRegistry = new CapabilityRegistry();

/**
 * Get contract from default registry
 */
export function getCapabilityContract(id: string): CapabilityContract | undefined {
  return capabilityRegistry.getContract(id);
}

/**
 * List all contracts
 */
export function listCapabilities(): CapabilityContract[] {
  return capabilityRegistry.listContracts();
}

/**
 * Find providers for a capability
 */
export function findProvidersFor(capabilityId: string): string[] {
  return capabilityRegistry.getProvidersFor(capabilityId);
}

/**
 * Resolve a dependency
 */
export function resolveCapability(
  siteId: string,
  dependency: CapabilityDependency
): CapabilityResolution {
  return capabilityRegistry.resolveDependency(siteId, dependency);
}
