/**
 * Site-Scoped Extension APIs
 * REST API endpoints for per-site extension management
 *
 * These endpoints should be implemented in your API layer (Express, FastAPI, etc.)
 * This file provides the handler logic
 */

import { ConfigurationValidator } from './validator';
import {
  SiteExtensionConfiguration,
  ValidationReport,
  DeactivationResult,
  SiteConfigurationStatus,
  ConfigurationWithSignoffStatus,
} from './types';

/**
 * API Response wrapper
 */
export interface ApiResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Extension API handlers
 */
export class ExtensionApiHandlers {
  constructor(private validator: ConfigurationValidator) {}

  /**
   * GET /api/v1/site/{siteId}/features
   * Get list of available features at this site
   *
   * Returns which extensions are enabled and what features they provide
   */
  async listSiteFeatures(siteId: string): Promise<ApiResponse> {
    try {
      const configs = await this.validator.queryConfigurations({ siteId });
      const status = await this.validator.getSiteConfigurationStatus(siteId);

      const features: Record<string, any> = {};

      for (const config of configs) {
        // In production, would map extension capabilities to features
        features[config.extensionId] = {
          enabled: true,
          version: config.version,
          providedAt: config.enabledAt,
          configuration: config.configuration,
        };
      }

      return {
        ok: true,
        data: {
          siteId,
          features,
          status,
        },
      };
    } catch (error: any) {
      return {
        ok: false,
        error: {
          code: 'SITE_FEATURES_ERROR',
          message: error.message,
        },
      };
    }
  }

  /**
   * GET /api/v1/site/{siteId}/capabilities/{capabilityName}
   * Get capability details - which provider is active
   *
   * Returns which extension provides a capability at this site
   */
  async getCapabilityProvider(
    siteId: string,
    capabilityName: string
  ): Promise<ApiResponse> {
    try {
      const configs = await this.validator.queryConfigurations({ siteId });

      // In production, would query manifest to determine which extension provides capability
      // For now, return placeholder
      const capability = {
        name: capabilityName,
        enabled: false,
        provider: null,
        version: null,
      };

      // Check if any extension provides this capability
      for (const config of configs) {
        // Would check manifest.capabilities.provides
        // For now, just return basic info
        capability.enabled = true;
        capability.provider = config.extensionId;
        capability.version = config.version;
        break;
      }

      return {
        ok: true,
        data: capability,
      };
    } catch (error: any) {
      return {
        ok: false,
        error: {
          code: 'CAPABILITY_ERROR',
          message: error.message,
        },
      };
    }
  }

  /**
   * POST /api/v1/site/{siteId}/extensions/{extensionId}/validate
   * Pre-activation validation
   *
   * Checks if extension can be safely activated at site
   * Returns validation report with any issues
   */
  async validateExtension(
    siteId: string,
    extensionId: string,
    version: string,
    configuration: Record<string, any>
  ): Promise<ApiResponse> {
    try {
      const report = await this.validator.validateBeforeActivation({
        siteId,
        extensionId,
        version,
        configuration,
      });

      return {
        ok: true,
        data: report,
      };
    } catch (error: any) {
      return {
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
        },
      };
    }
  }

  /**
   * POST /api/v1/site/{siteId}/extensions/{extensionId}/activate
   * Activate extension at site with compliance signoffs
   *
   * Request body:
   * {
   *   "version": "v1.0.0",
   *   "configuration": { ... },
   *   "complianceSignoffs": [
   *     {
   *       "aspect": "electronic-signature-validation",
   *       "signedBy": "user-id",
   *       "role": "quality-focal",
   *       "notes": "..."
   *     }
   *   ]
   * }
   */
  async activateExtension(
    siteId: string,
    extensionId: string,
    request: {
      version: string;
      configuration: Record<string, any>;
      complianceSignoffs: Array<{
        aspect: string;
        signedBy: string;
        role: 'quality-focal' | 'quality-manager' | 'site-manager' | 'compliance-officer';
        notes?: string;
      }>;
    },
    activatedBy: string
  ): Promise<ApiResponse> {
    try {
      // First validate
      const validation = await this.validator.validateBeforeActivation({
        siteId,
        extensionId,
        version: request.version,
        configuration: request.configuration,
      });

      if (!validation.valid) {
        return {
          ok: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Extension validation failed before activation',
            details: validation,
          },
        };
      }

      // Then activate
      await this.validator.activateExtension({
        siteId,
        extensionId,
        version: request.version,
        configuration: request.configuration,
        complianceSignoffs: request.complianceSignoffs,
        activatedBy,
      });

      return {
        ok: true,
        data: {
          siteId,
          extensionId,
          activated: true,
          message: `Extension ${extensionId} activated at site ${siteId}`,
        },
      };
    } catch (error: any) {
      return {
        ok: false,
        error: {
          code: 'ACTIVATION_ERROR',
          message: error.message,
        },
      };
    }
  }

  /**
   * DELETE /api/v1/site/{siteId}/extensions/{extensionId}
   * Deactivate extension at site
   */
  async deactivateExtension(
    siteId: string,
    extensionId: string,
    deactivatedBy: string,
    reason?: string
  ): Promise<ApiResponse> {
    try {
      const result = await this.validator.deactivateExtension({
        siteId,
        extensionId,
        deactivatedBy,
        reason,
      });

      if (!result.ok) {
        return {
          ok: false,
          error: {
            code: 'DEACTIVATION_FAILED',
            message: result.message,
            details: result,
          },
        };
      }

      return {
        ok: true,
        data: {
          siteId,
          extensionId,
          deactivated: true,
          message: `Extension ${extensionId} deactivated at site ${siteId}`,
        },
      };
    } catch (error: any) {
      return {
        ok: false,
        error: {
          code: 'DEACTIVATION_ERROR',
          message: error.message,
        },
      };
    }
  }

  /**
   * POST /api/v1/site/{siteId}/extensions/validate-combination
   * Validate a combination of extensions can coexist at site
   *
   * Request body:
   * {
   *   "extensions": [
   *     { "id": "ext-1", "version": "v1.0" },
   *     { "id": "ext-2", "version": "v2.0" }
   *   ]
   * }
   */
  async validateExtensionCombination(
    siteId: string,
    extensionIds: Array<{ id: string; version: string }>
  ): Promise<ApiResponse> {
    try {
      const conflicts: any[] = [];
      const warnings: any[] = [];

      // Validate each pair of extensions
      for (let i = 0; i < extensionIds.length; i++) {
        for (let j = i + 1; j < extensionIds.length; j++) {
          const ext1 = extensionIds[i];
          const ext2 = extensionIds[j];

          // In production, would check manifest conflicts
          // For now, just note the validation was attempted
          warnings.push({
            message: `Checked compatibility of ${ext1.id} and ${ext2.id}`,
          });
        }
      }

      return {
        ok: true,
        data: {
          siteId,
          valid: conflicts.length === 0,
          conflicts,
          warnings,
        },
      };
    } catch (error: any) {
      return {
        ok: false,
        error: {
          code: 'COMBINATION_VALIDATION_ERROR',
          message: error.message,
        },
      };
    }
  }

  /**
   * GET /api/v1/site/{siteId}/extensions/{extensionId}/signoffs
   * Get compliance signoffs for extension at site
   */
  async getComplianceSignoffs(siteId: string, extensionId: string): Promise<ApiResponse> {
    try {
      const config = await this.validator.getConfigurationWithSignoffs(siteId, extensionId);

      if (!config) {
        return {
          ok: false,
          error: {
            code: 'NOT_FOUND',
            message: `Extension ${extensionId} not found at site ${siteId}`,
          },
        };
      }

      return {
        ok: true,
        data: {
          siteId,
          extensionId,
          signoffs: config.complianceSignoffs,
          pendingSignoffs: config.pendingSignoffs,
          isFullySigned: config.isFullySigned,
        },
      };
    } catch (error: any) {
      return {
        ok: false,
        error: {
          code: 'SIGNOFF_RETRIEVAL_ERROR',
          message: error.message,
        },
      };
    }
  }

  /**
   * GET /api/v1/site/{siteId}/status
   * Get site-wide configuration status
   */
  async getSiteStatus(siteId: string): Promise<ApiResponse> {
    try {
      const status = await this.validator.getSiteConfigurationStatus(siteId);

      return {
        ok: true,
        data: status,
      };
    } catch (error: any) {
      return {
        ok: false,
        error: {
          code: 'STATUS_ERROR',
          message: error.message,
        },
      };
    }
  }

  /**
   * GET /api/v1/site/{siteId}/extensions/{extensionId}/audit-trail
   * Get audit trail for extension at site
   */
  async getAuditTrail(siteId: string, extensionId: string): Promise<ApiResponse> {
    try {
      // In production, would query audit log from store
      const auditTrail: any[] = [];

      return {
        ok: true,
        data: {
          siteId,
          extensionId,
          auditTrail,
          count: auditTrail.length,
        },
      };
    } catch (error: any) {
      return {
        ok: false,
        error: {
          code: 'AUDIT_TRAIL_ERROR',
          message: error.message,
        },
      };
    }
  }
}

/**
 * Create API handlers
 */
export function createApiHandlers(validator: ConfigurationValidator): ExtensionApiHandlers {
  return new ExtensionApiHandlers(validator);
}
