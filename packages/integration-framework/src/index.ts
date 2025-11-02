/**
 * Safe/Guardrailed Data Integration Framework
 * Main export file
 */

// Type exports
export * from './types';

// Connector exports
export { BaseIntegrationConnector } from './connectors/BaseIntegrationConnector';
export { IntegrationAdapterRegistry, integrationRegistry } from './connectors/IntegrationAdapterRegistry';
export {
  MESInternalConnector,
  ERPConnector,
  PLMConnector,
  DataHistorianConnector,
  QualitySystemsConnector,
} from './connectors/MESInternalConnector';

// Service exports
export { SafeQueryFramework, safeQueryFramework } from './services/SafeQueryFramework';
export { AuthenticationHandler, authenticationHandler } from './services/AuthenticationHandler';
export { DataValidator, dataValidator, ValidationRuleType } from './services/DataValidator';
export { ErrorHandlingService, errorHandlingService, CircuitBreaker } from './services/ErrorHandlingService';
export { AuditLoggingService, auditLoggingService } from './services/AuditLoggingService';
export { IntegrationManagementService, integrationManagementService } from './services/IntegrationManagementService';

// Re-export singletons for convenience
export {
  integrationRegistry,
  safeQueryFramework,
  authenticationHandler,
  dataValidator,
  errorHandlingService,
  auditLoggingService,
  integrationManagementService,
};
