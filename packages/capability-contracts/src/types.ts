/**
 * Core types for capability contracts
 */

/**
 * Stability level of a capability contract
 */
export enum StabilityLevel {
  STABLE = 'stable',
  BETA = 'beta',
  EXPERIMENTAL = 'experimental',
}

/**
 * Parameter definition in a capability method
 */
export interface ParameterDefinition {
  /** Parameter name */
  name: string;
  /** Parameter description */
  description: string;
  /** TypeScript type or reference */
  type: string;
  /** Whether parameter is required */
  required: boolean;
  /** Default value (if optional) */
  default?: any;
  /** Examples of valid values */
  examples?: any[];
}

/**
 * Type definition (return type, exception payload, etc.)
 */
export interface TypeDefinition {
  /** Type name or reference */
  type: string;
  /** Detailed description */
  description?: string;
  /** Schema URL or inline TypeScript type */
  schema?: string;
  /** Is this type nullable/optional */
  nullable: boolean;
}

/**
 * Event definition that capability may emit
 */
export interface EventDefinition {
  /** Event name */
  name: string;
  /** Event description */
  description: string;
  /** Event payload type */
  payload: TypeDefinition;
  /** When this event is typically emitted */
  triggerCondition?: string;
}

/**
 * Exception that method may throw
 */
export interface ExceptionDefinition {
  /** Exception name/type */
  name: string;
  /** When this exception is thrown */
  condition: string;
  /** Exception details */
  details: TypeDefinition;
}

/**
 * Method definition in a capability interface
 */
export interface MethodDefinition {
  /** Method name */
  name: string;
  /** Method description */
  description: string;
  /** Input parameters */
  parameters: ParameterDefinition[];
  /** Return type */
  returns: TypeDefinition;
  /** Exceptions that may be thrown */
  throws: ExceptionDefinition[];
  /** Whether method is required for minimum viable implementation */
  required: boolean;
  /** Version when this method was introduced */
  introducedIn?: string;
  /** Version when this method was deprecated (if any) */
  deprecatedIn?: string;
  /** Replacement method if deprecated */
  replacement?: string;
  /** Usage examples */
  examples?: string[];
}

/**
 * Capability interface definition
 */
export interface CapabilityInterface {
  /** List of required methods */
  methods: MethodDefinition[];
  /** Events that capability may emit */
  events?: EventDefinition[];
  /** Webhooks or async callbacks */
  webhooks?: {
    name: string;
    description: string;
    payload: TypeDefinition;
  }[];
}

/**
 * Policy that may be enforced by implementations
 */
export interface CapabilityPolicy {
  /** Policy identifier */
  id: string;
  /** Human-readable policy name */
  name: string;
  /** Policy description */
  description: string;
  /** Extensions using this policy */
  providers?: string[];
}

/**
 * Compliance requirement for capability
 */
export interface ComplianceRequirement {
  /** Applicable regulations */
  regulations: string[];
  /** Whether signoff is required to enable extension providing this capability */
  signoffRequired: boolean;
  /** Compliance delegation role required for signoff */
  signoffRole?: string;
}

/**
 * Version information
 */
export interface ContractVersion {
  /** Version string (SemVer) */
  version: string;
  /** Release date */
  releaseDate: Date;
  /** What changed in this version */
  changelog: string;
  /** Breaking changes (if any) */
  breakingChanges?: string[];
}

/**
 * Complete capability contract definition
 */
export interface CapabilityContract {
  // === Identity ===
  /** Unique capability identifier (kebab-case) */
  id: string;

  /** Human-readable capability name */
  name: string;

  /** Detailed description */
  description: string;

  // === Versioning ===
  /** Contract version (SemVer) */
  version: string;

  /** All versions of this contract */
  versions?: ContractVersion[];

  // === Compatibility ===
  /** Minimum MachShop MES version that supports this capability */
  minMesVersion: string;

  /** API version required */
  apiVersion?: string;

  // === Interface & Implementation ===
  /** Methods and events that implementations must provide */
  interface: CapabilityInterface;

  /** List of methods that are required for MVP implementation */
  requiredMethods: string[];

  /** Optional methods that implementations may include */
  optionalMethods?: string[];

  // === Policies & Configuration ===
  /** Policies that implementations may enforce */
  policies?: CapabilityPolicy[];

  /** Configuration schema that implementations must accept */
  configurationSchema?: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };

  // === Providers & Defaults ===
  /** Default/reference implementation (if any) */
  defaultProvider?: string;

  /** Known extensions that provide this capability */
  knownProviders: string[];

  // === Lifecycle ===
  /** Stability level (stable, beta, experimental) */
  stability: StabilityLevel;

  /** Version when capability was introduced */
  introducedIn: string;

  /** Version when capability was deprecated (if any) */
  deprecatedIn?: string;

  /** Recommended replacement if deprecated */
  replacement?: string;

  // === Compliance & Governance ===
  /** Compliance requirements and implications */
  compliance?: ComplianceRequirement;

  /** Whether capability is part of core foundation tier */
  foundationTier?: 'core-foundation' | 'foundation' | 'application';

  // === Documentation & Examples ===
  /** URL to API documentation */
  documentationUrl?: string;

  /** Example implementation (manifests, code snippets) */
  examples?: {
    name: string;
    description: string;
    extensionId: string;
    manifestUrl?: string;
    codeUrl?: string;
  }[];

  /** Common integration patterns */
  integrationPatterns?: {
    name: string;
    description: string;
    diagram?: string;
  }[];

  // === Compatibility Matrix ===
  /** Known incompatibilities with other capabilities or policies */
  incompatibilities?: {
    capability?: string;
    policy?: string;
    reason: string;
    scope: 'global' | 'capability' | 'resource';
  }[];
}

/**
 * Extension-provided capability (from manifest)
 */
export interface CapabilityProvides {
  /** Capability identifier */
  capability: string;
  /** Implementation version */
  version: string;
  /** Extension ID providing this capability */
  extensionId: string;
  /** URL to contract */
  contractUrl?: string;
  /** List of implemented methods */
  implements: string[];
  /** Policy this implementation enforces (if any) */
  policy?: string;
}

/**
 * Capability dependency (from manifest)
 */
export interface CapabilityDependency {
  /** Required capability */
  capability: string;
  /** Minimum version */
  minVersion?: string;
  /** Preferred provider (optional) */
  provider?: string;
}
