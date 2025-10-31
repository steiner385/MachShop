/**
 * NCR Workflow Configuration Service
 *
 * Manages workflow configuration per site and severity level for customizable
 * NCR processing rules (Issue #55).
 *
 * @module services/NCRWorkflowConfigService
 * @see GitHub Issue #55: Enhanced NCR Workflow States & Disposition Management
 */

import { PrismaClient, NCRSeverity } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

/**
 * Workflow configuration DTO
 */
export interface WorkflowConfigDTO {
  siteId?: string;
  severityLevel?: NCRSeverity;
  enabledStates: string[];
  initialState: string;
  stateTransitions: Record<string, string[]>;
  requiredFieldsByState?: Record<string, string[]>;
  ctpEnabled: boolean;
  ctpApprovalRole?: string;
  ctpPreventFinalShip: boolean;
  ddrEnabled: boolean;
  ddrAutoTriggerHours?: number;
  ddrEscalationThreshold: number;
  mrbEnabled: boolean;
  mrbValueThreshold?: number;
  mrbTriggerConditions?: string[];
  mrbRequiredAttendees?: string[];
  mrbVotingMethod: 'UNANIMOUS' | 'MAJORITY' | 'CHAIR_DECIDES' | 'NO_VOTE';
  allowedDispositions: string[];
  dispositionApprovalRules?: Record<string, any>;
  createdBy: string;
}

/**
 * NCR Workflow Configuration Service
 */
export class NCRWorkflowConfigService {
  /**
   * Default workflow configuration
   */
  private getDefaultConfig(): WorkflowConfigDTO {
    return {
      enabledStates: [
        'DRAFT',
        'SUBMITTED',
        'UNDER_INVESTIGATION',
        'CONTAINMENT',
        'PENDING_DISPOSITION',
        'CTP',
        'DDR',
        'MRB',
        'CORRECTIVE_ACTION',
        'VERIFICATION',
        'CLOSED',
        'CANCELLED',
      ],
      initialState: 'DRAFT',
      stateTransitions: {
        'DRAFT': ['SUBMITTED', 'CANCELLED'],
        'SUBMITTED': ['UNDER_INVESTIGATION', 'CANCELLED'],
        'UNDER_INVESTIGATION': ['CONTAINMENT', 'PENDING_DISPOSITION', 'CANCELLED'],
        'CONTAINMENT': ['PENDING_DISPOSITION'],
        'PENDING_DISPOSITION': ['CTP', 'DDR', 'MRB', 'CORRECTIVE_ACTION'],
        'CTP': ['CORRECTIVE_ACTION', 'CLOSED'],
        'DDR': ['CORRECTIVE_ACTION', 'CLOSED'],
        'MRB': ['CORRECTIVE_ACTION', 'CLOSED'],
        'CORRECTIVE_ACTION': ['VERIFICATION'],
        'VERIFICATION': ['CLOSED'],
      },
      ctpEnabled: true,
      ctpPreventFinalShip: true,
      ddrEnabled: true,
      ddrEscalationThreshold: 24,
      mrbEnabled: true,
      mrbVotingMethod: 'UNANIMOUS',
      allowedDispositions: [
        'REWORK',
        'REPAIR',
        'SCRAP',
        'USE_AS_IS',
        'RETURN_TO_SUPPLIER',
        'SORT_AND_SEGREGATE',
        'RETURN_TO_STOCK',
        'ENGINEER_USE_ONLY',
      ],
      createdBy: 'SYSTEM',
    };
  }

  /**
   * Get configuration for site and severity
   *
   * @param siteId - Site ID (optional, null for global default)
   * @param severityLevel - NCR severity level (optional, null for all severities)
   * @returns Workflow configuration
   */
  async getConfiguration(
    siteId?: string,
    severityLevel?: NCRSeverity
  ): Promise<WorkflowConfigDTO> {
    try {
      // Look for specific configuration
      let config = await prisma.nCRWorkflowConfig.findFirst({
        where: {
          siteId: siteId || null,
          severityLevel: severityLevel || null,
          isActive: true,
        },
      });

      // If not found and severity was specified, try without severity
      if (!config && severityLevel) {
        config = await prisma.nCRWorkflowConfig.findFirst({
          where: {
            siteId: siteId || null,
            severityLevel: null,
            isActive: true,
          },
        });
      }

      // If still not found, use default
      if (!config) {
        return this.getDefaultConfig();
      }

      return this.mapToDTO(config);
    } catch (error) {
      logger.error('Failed to get workflow configuration', { error });
      throw error;
    }
  }

  /**
   * Create or update workflow configuration
   *
   * @param configDTO - Configuration to save
   * @returns Created/updated configuration
   */
  async saveConfiguration(configDTO: WorkflowConfigDTO): Promise<WorkflowConfigDTO> {
    try {
      // Check if configuration already exists
      const existing = await prisma.nCRWorkflowConfig.findFirst({
        where: {
          siteId: configDTO.siteId || null,
          severityLevel: configDTO.severityLevel || null,
        },
      });

      let config;

      if (existing) {
        // Update existing
        config = await prisma.nCRWorkflowConfig.update({
          where: { id: existing.id },
          data: {
            enabledStates: JSON.stringify(configDTO.enabledStates),
            initialState: configDTO.initialState as any,
            stateTransitions: JSON.stringify(configDTO.stateTransitions),
            requiredFieldsByState: configDTO.requiredFieldsByState
              ? JSON.stringify(configDTO.requiredFieldsByState)
              : null,
            ctpEnabled: configDTO.ctpEnabled,
            ctpApprovalRole: configDTO.ctpApprovalRole,
            ctpPreventFinalShip: configDTO.ctpPreventFinalShip,
            ddrEnabled: configDTO.ddrEnabled,
            ddrAutoTriggerHours: configDTO.ddrAutoTriggerHours,
            ddrEscalationThreshold: configDTO.ddrEscalationThreshold,
            mrbEnabled: configDTO.mrbEnabled,
            mrbValueThreshold: configDTO.mrbValueThreshold ? BigInt(configDTO.mrbValueThreshold) : null,
            mrbTriggerConditions: configDTO.mrbTriggerConditions
              ? JSON.stringify(configDTO.mrbTriggerConditions)
              : null,
            mrbRequiredAttendees: configDTO.mrbRequiredAttendees
              ? JSON.stringify(configDTO.mrbRequiredAttendees)
              : null,
            mrbVotingMethod: configDTO.mrbVotingMethod as any,
            allowedDispositions: JSON.stringify(configDTO.allowedDispositions),
            dispositionApprovalRules: configDTO.dispositionApprovalRules
              ? JSON.stringify(configDTO.dispositionApprovalRules)
              : null,
            createdBy: configDTO.createdBy,
          },
        });
      } else {
        // Create new
        config = await prisma.nCRWorkflowConfig.create({
          data: {
            siteId: configDTO.siteId,
            severityLevel: configDTO.severityLevel,
            enabledStates: JSON.stringify(configDTO.enabledStates),
            initialState: configDTO.initialState as any,
            stateTransitions: JSON.stringify(configDTO.stateTransitions),
            requiredFieldsByState: configDTO.requiredFieldsByState
              ? JSON.stringify(configDTO.requiredFieldsByState)
              : null,
            ctpEnabled: configDTO.ctpEnabled,
            ctpApprovalRole: configDTO.ctpApprovalRole,
            ctpPreventFinalShip: configDTO.ctpPreventFinalShip,
            ddrEnabled: configDTO.ddrEnabled,
            ddrAutoTriggerHours: configDTO.ddrAutoTriggerHours,
            ddrEscalationThreshold: configDTO.ddrEscalationThreshold,
            mrbEnabled: configDTO.mrbEnabled,
            mrbValueThreshold: configDTO.mrbValueThreshold ? BigInt(configDTO.mrbValueThreshold) : null,
            mrbTriggerConditions: configDTO.mrbTriggerConditions
              ? JSON.stringify(configDTO.mrbTriggerConditions)
              : null,
            mrbRequiredAttendees: configDTO.mrbRequiredAttendees
              ? JSON.stringify(configDTO.mrbRequiredAttendees)
              : null,
            mrbVotingMethod: configDTO.mrbVotingMethod as any,
            allowedDispositions: JSON.stringify(configDTO.allowedDispositions),
            dispositionApprovalRules: configDTO.dispositionApprovalRules
              ? JSON.stringify(configDTO.dispositionApprovalRules)
              : null,
            createdBy: configDTO.createdBy,
          },
        });
      }

      logger.info('Workflow configuration saved', {
        siteId: configDTO.siteId,
        severityLevel: configDTO.severityLevel,
      });

      return this.mapToDTO(config);
    } catch (error) {
      logger.error('Failed to save workflow configuration', { error });
      throw error;
    }
  }

  /**
   * Get all configurations for a site
   *
   * @param siteId - Site ID
   * @returns Array of configurations for the site
   */
  async getSiteConfigurations(siteId: string): Promise<WorkflowConfigDTO[]> {
    try {
      const configs = await prisma.nCRWorkflowConfig.findMany({
        where: {
          siteId,
          isActive: true,
        },
        orderBy: {
          severityLevel: 'asc',
        },
      });

      return configs.map(config => this.mapToDTO(config));
    } catch (error) {
      logger.error('Failed to get site configurations', { error });
      throw error;
    }
  }

  /**
   * Validate state transition is allowed
   *
   * @param siteId - Site ID
   * @param severityLevel - NCR severity
   * @param fromState - From state
   * @param toState - To state
   * @returns true if transition is allowed
   */
  async isTransitionAllowed(
    siteId: string | undefined,
    severityLevel: NCRSeverity | undefined,
    fromState: string,
    toState: string
  ): Promise<boolean> {
    try {
      const config = await this.getConfiguration(siteId, severityLevel);
      const transitions = config.stateTransitions[fromState];

      if (!transitions) {
        return false;
      }

      return transitions.includes(toState);
    } catch (error) {
      logger.error('Failed to validate transition', { error });
      throw error;
    }
  }

  /**
   * Get required fields for state transition
   *
   * @param siteId - Site ID
   * @param severityLevel - NCR severity
   * @param state - State
   * @returns Array of required field names
   */
  async getRequiredFieldsForState(
    siteId: string | undefined,
    severityLevel: NCRSeverity | undefined,
    state: string
  ): Promise<string[]> {
    try {
      const config = await this.getConfiguration(siteId, severityLevel);
      const requiredFields = config.requiredFieldsByState?.[state];

      return requiredFields || [];
    } catch (error) {
      logger.error('Failed to get required fields', { error });
      throw error;
    }
  }

  /**
   * Validate disposition is allowed
   *
   * @param siteId - Site ID
   * @param severityLevel - NCR severity
   * @param disposition - Disposition value
   * @returns true if disposition is allowed
   */
  async isDispositionAllowed(
    siteId: string | undefined,
    severityLevel: NCRSeverity | undefined,
    disposition: string
  ): Promise<boolean> {
    try {
      const config = await this.getConfiguration(siteId, severityLevel);
      return config.allowedDispositions.includes(disposition);
    } catch (error) {
      logger.error('Failed to validate disposition', { error });
      throw error;
    }
  }

  /**
   * Check if MRB is required
   *
   * @param siteId - Site ID
   * @param severityLevel - NCR severity
   * @param ncrCost - NCR estimated cost
   * @returns true if MRB is required
   */
  async isMRBRequired(
    siteId: string | undefined,
    severityLevel: NCRSeverity | undefined,
    ncrCost?: number
  ): Promise<boolean> {
    try {
      const config = await this.getConfiguration(siteId, severityLevel);

      if (!config.mrbEnabled) {
        return false;
      }

      // Check cost threshold if specified
      if (config.mrbValueThreshold && ncrCost && ncrCost > config.mrbValueThreshold) {
        return true;
      }

      // Could add other trigger conditions here
      return false;
    } catch (error) {
      logger.error('Failed to check if MRB required', { error });
      throw error;
    }
  }

  /**
   * Deactivate configuration
   *
   * @param siteId - Site ID
   * @param severityLevel - NCR severity
   */
  async deactivateConfiguration(siteId?: string, severityLevel?: NCRSeverity): Promise<void> {
    try {
      await prisma.nCRWorkflowConfig.updateMany({
        where: {
          siteId: siteId || null,
          severityLevel: severityLevel || null,
        },
        data: {
          isActive: false,
        },
      });

      logger.info('Workflow configuration deactivated', { siteId, severityLevel });
    } catch (error) {
      logger.error('Failed to deactivate configuration', { error });
      throw error;
    }
  }

  /**
   * Map database record to DTO
   *
   * @param config - Configuration record
   * @returns Configuration DTO
   */
  private mapToDTO(config: any): WorkflowConfigDTO {
    return {
      siteId: config.siteId,
      severityLevel: config.severityLevel,
      enabledStates: JSON.parse(config.enabledStates),
      initialState: config.initialState,
      stateTransitions: JSON.parse(config.stateTransitions),
      requiredFieldsByState: config.requiredFieldsByState ? JSON.parse(config.requiredFieldsByState) : undefined,
      ctpEnabled: config.ctpEnabled,
      ctpApprovalRole: config.ctpApprovalRole,
      ctpPreventFinalShip: config.ctpPreventFinalShip,
      ddrEnabled: config.ddrEnabled,
      ddrAutoTriggerHours: config.ddrAutoTriggerHours,
      ddrEscalationThreshold: config.ddrEscalationThreshold,
      mrbEnabled: config.mrbEnabled,
      mrbValueThreshold: config.mrbValueThreshold ? Number(config.mrbValueThreshold) : undefined,
      mrbTriggerConditions: config.mrbTriggerConditions ? JSON.parse(config.mrbTriggerConditions) : undefined,
      mrbRequiredAttendees: config.mrbRequiredAttendees ? JSON.parse(config.mrbRequiredAttendees) : undefined,
      mrbVotingMethod: config.mrbVotingMethod,
      allowedDispositions: JSON.parse(config.allowedDispositions),
      dispositionApprovalRules: config.dispositionApprovalRules ? JSON.parse(config.dispositionApprovalRules) : undefined,
      createdBy: config.createdBy,
    };
  }
}

// Export singleton instance
export const ncrWorkflowConfigService = new NCRWorkflowConfigService();
