/**
 * MachShop Configuration Validator Service
 * Per-site extension configuration management with compliance tracking and audit trails
 */

export {
  // Types
  SiteExtensionConfiguration,
  ComplianceSignoff,
  DetectedConflict,
  DependencyResolution,
  ValidationReport,
  PreActivationValidationRequest,
  ActivateExtensionRequest,
  DeactivateExtensionRequest,
  DeactivationResult,
  ComplianceSignoffInput,
  SignoffRecord,
  ConfigurationAuditEntry,
  ConfigurationFilter,
  SignoffFilter,
  ConfigurationChangeEvent,
  SiteConfigurationStatus,
  ConfigurationWithSignoffStatus,
} from './types';

export {
  // Validator service
  ConfigurationValidator,
  configurationValidator,
  createValidator,
  // Store interface and in-memory implementation
  ConfigurationStore,
  InMemoryConfigurationStore,
} from './validator';
