/**
 * UserPreferenceService
 *
 * GitHub Issue #19: Configurable Side-by-Side Execution Interface
 *
 * Manages user layout preferences for configurable work instruction execution.
 * Handles per-user defaults, per-workstation overrides, and workstation configurations.
 */

import { PrismaClient, LayoutMode, PanelPosition } from '@prisma/client';
import { logger } from '../utils/logger';

// Type definitions for preference operations
export interface PreferenceUpdate {
  layoutMode?: LayoutMode;
  splitRatio?: number;
  panelPosition?: PanelPosition;
  autoAdvanceSteps?: boolean;
  showStepTimer?: boolean;
  compactMode?: boolean;
  useSecondMonitor?: boolean;
  secondMonitorPosition?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ConfigUpdate {
  screenWidth?: number;
  screenHeight?: number;
  isMultiMonitor?: boolean;
  monitorCount?: number;
  forcedLayout?: LayoutMode;
  allowUserOverride?: boolean;
  isTouchScreen?: boolean;
  touchTargetSize?: number;
}

export interface PreferenceExport {
  preferences: {
    layoutMode: LayoutMode;
    splitRatio: number;
    panelPosition: PanelPosition;
    autoAdvanceSteps: boolean;
    showStepTimer: boolean;
    compactMode: boolean;
    useSecondMonitor: boolean;
    secondMonitorPosition?: any;
  };
  exportedAt: Date;
  version: string;
}

export class UserPreferenceService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Get user preferences for a specific workstation (or default if no workstation specified)
   */
  async getUserPreferences(userId: string, workstationId?: string): Promise<any> {
    try {
      logger.info(`[UserPreference] Getting preferences for user: ${userId}${workstationId ? `, workstation: ${workstationId}` : ' (default)'}`);

      // First try to get workstation-specific preferences
      if (workstationId) {
        const workstationPrefs = await this.prisma.userWorkstationPreference.findUnique({
          where: {
            userId_workstationId: {
              userId,
              workstationId
            }
          }
        });

        if (workstationPrefs && workstationPrefs.isActive) {
          logger.info(`[UserPreference] ✅ Found workstation-specific preferences`);
          return workstationPrefs;
        }
      }

      // Fall back to default preferences (workstationId = null)
      const defaultPrefs = await this.prisma.userWorkstationPreference.findUnique({
        where: {
          userId_workstationId: {
            userId,
            workstationId: null
          }
        }
      });

      if (defaultPrefs && defaultPrefs.isActive) {
        logger.info(`[UserPreference] ✅ Found default preferences`);
        return defaultPrefs;
      }

      // If no preferences exist, create default preferences
      logger.info(`[UserPreference] Creating default preferences for user`);
      const newPrefs = await this.prisma.userWorkstationPreference.create({
        data: {
          userId,
          workstationId: null,
          layoutMode: LayoutMode.SPLIT_VERTICAL,
          splitRatio: 0.6,
          panelPosition: PanelPosition.LEFT,
          autoAdvanceSteps: false,
          showStepTimer: true,
          compactMode: false,
          useSecondMonitor: false
        }
      });

      logger.info(`[UserPreference] ✅ Created default preferences: ${newPrefs.id}`);
      return newPrefs;

    } catch (error) {
      logger.error('[UserPreference] Get preferences failed:', error);
      throw new Error(`Get user preferences failed: ${error.message}`);
    }
  }

  /**
   * Save or update user preferences
   */
  async saveUserPreferences(userId: string, preferences: PreferenceUpdate, workstationId?: string): Promise<any> {
    try {
      logger.info(`[UserPreference] Saving preferences for user: ${userId}${workstationId ? `, workstation: ${workstationId}` : ' (default)'}`);

      // Validate split ratio
      if (preferences.splitRatio !== undefined && (preferences.splitRatio < 0.1 || preferences.splitRatio > 0.9)) {
        throw new Error('Split ratio must be between 0.1 and 0.9');
      }

      // Validate touch target size
      if (preferences.touchTargetSize !== undefined && preferences.touchTargetSize < 24) {
        throw new Error('Touch target size must be at least 24 pixels');
      }

      const updateData: any = {
        ...preferences,
        updatedAt: new Date()
      };

      // Convert secondMonitorPosition to JSON if provided
      if (preferences.secondMonitorPosition) {
        updateData.secondMonitorPosition = preferences.secondMonitorPosition;
      }

      const updatedPrefs = await this.prisma.userWorkstationPreference.upsert({
        where: {
          userId_workstationId: {
            userId,
            workstationId: workstationId || null
          }
        },
        update: updateData,
        create: {
          userId,
          workstationId: workstationId || null,
          layoutMode: preferences.layoutMode || LayoutMode.SPLIT_VERTICAL,
          splitRatio: preferences.splitRatio || 0.6,
          panelPosition: preferences.panelPosition || PanelPosition.LEFT,
          autoAdvanceSteps: preferences.autoAdvanceSteps || false,
          showStepTimer: preferences.showStepTimer !== undefined ? preferences.showStepTimer : true,
          compactMode: preferences.compactMode || false,
          useSecondMonitor: preferences.useSecondMonitor || false,
          secondMonitorPosition: preferences.secondMonitorPosition || null
        }
      });

      logger.info(`[UserPreference] ✅ Preferences saved successfully: ${updatedPrefs.id}`);
      return updatedPrefs;

    } catch (error) {
      logger.error('[UserPreference] Save preferences failed:', error);
      throw new Error(`Save user preferences failed: ${error.message}`);
    }
  }

  /**
   * Get workstation display configuration
   */
  async getWorkstationConfig(workstationId: string): Promise<any> {
    try {
      logger.info(`[UserPreference] Getting workstation config: ${workstationId}`);

      const config = await this.prisma.workstationDisplayConfig.findUnique({
        where: { workstationId }
      });

      if (!config) {
        logger.info(`[UserPreference] No config found, creating default for workstation: ${workstationId}`);

        // Create default configuration
        const defaultConfig = await this.prisma.workstationDisplayConfig.create({
          data: {
            workstationId,
            isMultiMonitor: false,
            monitorCount: 1,
            allowUserOverride: true,
            isTouchScreen: false,
            touchTargetSize: 48,
            updatedById: 'system' // TODO: Use actual user ID when available
          }
        });

        return defaultConfig;
      }

      logger.info(`[UserPreference] ✅ Found workstation config`);
      return config;

    } catch (error) {
      logger.error('[UserPreference] Get workstation config failed:', error);
      throw new Error(`Get workstation config failed: ${error.message}`);
    }
  }

  /**
   * Update workstation display configuration
   */
  async updateWorkstationConfig(workstationId: string, config: ConfigUpdate, updatedById: string): Promise<any> {
    try {
      logger.info(`[UserPreference] Updating workstation config: ${workstationId}`);

      // Validate monitor count
      if (config.monitorCount !== undefined && config.monitorCount < 1) {
        throw new Error('Monitor count must be at least 1');
      }

      // Validate screen dimensions
      if (config.screenWidth !== undefined && config.screenWidth < 800) {
        throw new Error('Screen width must be at least 800 pixels');
      }
      if (config.screenHeight !== undefined && config.screenHeight < 600) {
        throw new Error('Screen height must be at least 600 pixels');
      }

      const updatedConfig = await this.prisma.workstationDisplayConfig.upsert({
        where: { workstationId },
        update: {
          ...config,
          updatedAt: new Date(),
          updatedById
        },
        create: {
          workstationId,
          screenWidth: config.screenWidth,
          screenHeight: config.screenHeight,
          isMultiMonitor: config.isMultiMonitor || false,
          monitorCount: config.monitorCount || 1,
          forcedLayout: config.forcedLayout,
          allowUserOverride: config.allowUserOverride !== undefined ? config.allowUserOverride : true,
          isTouchScreen: config.isTouchScreen || false,
          touchTargetSize: config.touchTargetSize || 48,
          updatedById
        }
      });

      logger.info(`[UserPreference] ✅ Workstation config updated successfully`);
      return updatedConfig;

    } catch (error) {
      logger.error('[UserPreference] Update workstation config failed:', error);
      throw new Error(`Update workstation config failed: ${error.message}`);
    }
  }

  /**
   * Reset user preferences to defaults
   */
  async resetToDefaults(userId: string, workstationId?: string): Promise<any> {
    try {
      logger.info(`[UserPreference] Resetting preferences to defaults for user: ${userId}${workstationId ? `, workstation: ${workstationId}` : ' (default)'}`);

      const defaultPrefs = await this.prisma.userWorkstationPreference.upsert({
        where: {
          userId_workstationId: {
            userId,
            workstationId: workstationId || null
          }
        },
        update: {
          layoutMode: LayoutMode.SPLIT_VERTICAL,
          splitRatio: 0.6,
          panelPosition: PanelPosition.LEFT,
          autoAdvanceSteps: false,
          showStepTimer: true,
          compactMode: false,
          useSecondMonitor: false,
          secondMonitorPosition: null,
          updatedAt: new Date()
        },
        create: {
          userId,
          workstationId: workstationId || null,
          layoutMode: LayoutMode.SPLIT_VERTICAL,
          splitRatio: 0.6,
          panelPosition: PanelPosition.LEFT,
          autoAdvanceSteps: false,
          showStepTimer: true,
          compactMode: false,
          useSecondMonitor: false
        }
      });

      logger.info(`[UserPreference] ✅ Preferences reset to defaults`);
      return defaultPrefs;

    } catch (error) {
      logger.error('[UserPreference] Reset to defaults failed:', error);
      throw new Error(`Reset to defaults failed: ${error.message}`);
    }
  }

  /**
   * Export user preferences for backup/migration
   */
  async exportPreferences(userId: string): Promise<PreferenceExport> {
    try {
      logger.info(`[UserPreference] Exporting preferences for user: ${userId}`);

      // Get default preferences
      const prefs = await this.getUserPreferences(userId);

      const exportData: PreferenceExport = {
        preferences: {
          layoutMode: prefs.layoutMode,
          splitRatio: prefs.splitRatio,
          panelPosition: prefs.panelPosition,
          autoAdvanceSteps: prefs.autoAdvanceSteps,
          showStepTimer: prefs.showStepTimer,
          compactMode: prefs.compactMode,
          useSecondMonitor: prefs.useSecondMonitor,
          secondMonitorPosition: prefs.secondMonitorPosition
        },
        exportedAt: new Date(),
        version: '1.0'
      };

      logger.info(`[UserPreference] ✅ Preferences exported successfully`);
      return exportData;

    } catch (error) {
      logger.error('[UserPreference] Export preferences failed:', error);
      throw new Error(`Export preferences failed: ${error.message}`);
    }
  }

  /**
   * Import user preferences from backup/migration
   */
  async importPreferences(userId: string, data: PreferenceExport): Promise<void> {
    try {
      logger.info(`[UserPreference] Importing preferences for user: ${userId}`);

      // Validate import data
      if (!data.preferences || !data.version) {
        throw new Error('Invalid import data format');
      }

      // Import preferences (overwrites existing)
      await this.saveUserPreferences(userId, data.preferences);

      logger.info(`[UserPreference] ✅ Preferences imported successfully`);

    } catch (error) {
      logger.error('[UserPreference] Import preferences failed:', error);
      throw new Error(`Import preferences failed: ${error.message}`);
    }
  }

  /**
   * Get all preferences for a user (default + workstation-specific)
   */
  async getAllUserPreferences(userId: string): Promise<any[]> {
    try {
      logger.info(`[UserPreference] Getting all preferences for user: ${userId}`);

      const allPrefs = await this.prisma.userWorkstationPreference.findMany({
        where: {
          userId,
          isActive: true
        },
        orderBy: [
          { workstationId: 'asc' },
          { createdAt: 'desc' }
        ]
      });

      logger.info(`[UserPreference] ✅ Found ${allPrefs.length} preference records`);
      return allPrefs;

    } catch (error) {
      logger.error('[UserPreference] Get all preferences failed:', error);
      throw new Error(`Get all user preferences failed: ${error.message}`);
    }
  }

  /**
   * Check if layout mode is allowed for workstation
   */
  async isLayoutModeAllowed(workstationId: string, layoutMode: LayoutMode): Promise<boolean> {
    try {
      const config = await this.getWorkstationConfig(workstationId);

      // If there's a forced layout, only that layout is allowed
      if (config.forcedLayout && !config.allowUserOverride) {
        return config.forcedLayout === layoutMode;
      }

      // All layouts are allowed if no restrictions
      return true;

    } catch (error) {
      logger.error('[UserPreference] Check layout mode failed:', error);
      // Default to allowing all layouts if config check fails
      return true;
    }
  }

  /**
   * Cleanup method for proper service shutdown
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

export default UserPreferenceService;