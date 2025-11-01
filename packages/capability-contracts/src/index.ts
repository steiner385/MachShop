/**
 * MachShop Capability Contracts
 * Central registry and definitions of all capabilities in the extension framework
 */

export {
  // Core types
  CapabilityContract,
  CapabilityPolicy,
  MethodDefinition,
  ParameterDefinition,
  TypeDefinition,
  EventDefinition,
  ExceptionDefinition,
  ComplianceRequirement,
  StabilityLevel,
  ContractVersion,
} from './types';

export {
  // Registry and resolution
  CapabilityRegistry,
  CapabilityResolution,
  ProviderResolution,
  VersionResolution,
} from './registry';

export {
  // Built-in contracts
  ERP_INTEGRATION_CONTRACT,
  WORK_INSTRUCTION_AUTHORING_CONTRACT,
  QUALITY_COMPLIANCE_CONTRACT,
  EQUIPMENT_INTEGRATION_CONTRACT,
  ELECTRONIC_SIGNATURE_CONTRACT,
  AUDIT_TRAIL_CONTRACT,
  CUSTOM_FIELD_STORAGE_CONTRACT,
  AUTHENTICATION_PROVIDER_CONTRACT,
  getAllCapabilityContracts,
} from './contracts';

export {
  // Validation utilities
  validateCapabilityContract,
  validateCapabilityProvides,
  validateCapabilityDependency,
  validateCapabilityVersion,
  validatePolicyConflict,
} from './validation';

export {
  // Contract resolver (default instance)
  capabilityRegistry,
  resolveCapability,
  getCapabilityContract,
  listCapabilities,
  findProvidersFor,
} from './resolver';
