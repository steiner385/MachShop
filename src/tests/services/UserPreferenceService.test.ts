import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import prisma from '../../lib/database';

// Mock the database module
vi.mock('../../lib/database', () => ({
  default: {
    userWorkstationPreference: {
      findUnique: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
    workstationDisplayConfig: {
      findUnique: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
    },
    $disconnect: vi.fn(),
  },
}));

// Mock logger
vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

import { UserPreferenceService, PreferenceUpdate, ConfigUpdate, PreferenceExport } from '../../services/UserPreferenceService';
import { LayoutMode, PanelPosition } from '@prisma/client';

describe('UserPreferenceService', () => {
  let userPreferenceService: UserPreferenceService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = prisma as any;
    userPreferenceService = new UserPreferenceService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create instance with PrismaClient', () => {
      const service = new UserPreferenceService();
      expect(service).toBeInstanceOf(UserPreferenceService);
    });
  });

  describe('getUserPreferences', () => {
    const mockUser = {
      id: 'pref-1',
      userId: 'user-1',
      workstationId: 'ws-1',
      layoutMode: LayoutMode.SPLIT_VERTICAL,
      splitRatio: 0.6,
      panelPosition: PanelPosition.LEFT,
      autoAdvanceSteps: false,
      showStepTimer: true,
      compactMode: false,
      useSecondMonitor: false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should return workstation-specific preferences when found', async () => {
      (mockPrisma.userWorkstationPreference.findUnique as any).mockResolvedValueOnce(mockUser);

      const result = await userPreferenceService.getUserPreferences('user-1', 'ws-1');

      expect(result).toEqual(mockUser);
      expect(mockPrisma.userWorkstationPreference.findUnique).toHaveBeenCalledWith({
        where: {
          userId_workstationId: {
            userId: 'user-1',
            workstationId: 'ws-1'
          }
        }
      });
    });

    it('should fallback to default preferences when workstation-specific not found', async () => {
      const mockDefault = { ...mockUser, workstationId: null };

      (mockPrisma.userWorkstationPreference.findUnique as any)
        .mockResolvedValueOnce(null) // workstation-specific
        .mockResolvedValueOnce(mockDefault); // default

      const result = await userPreferenceService.getUserPreferences('user-1', 'ws-1');

      expect(result).toEqual(mockDefault);
      expect(mockPrisma.userWorkstationPreference.findUnique).toHaveBeenCalledTimes(2);
    });

    it('should create default preferences when none exist', async () => {
      const mockCreated = { ...mockUser, workstationId: null };

      (mockPrisma.userWorkstationPreference.findUnique as any)
        .mockResolvedValueOnce(null) // workstation-specific
        .mockResolvedValueOnce(null); // default
      (mockPrisma.userWorkstationPreference.create as any).mockResolvedValueOnce(mockCreated);

      const result = await userPreferenceService.getUserPreferences('user-1', 'ws-1');

      expect(result).toEqual(mockCreated);
      expect(mockPrisma.userWorkstationPreference.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
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
    });

    it('should return default preferences when no workstation specified', async () => {
      const mockDefault = { ...mockUser, workstationId: null };

      (mockPrisma.userWorkstationPreference.findUnique as any).mockResolvedValueOnce(mockDefault);

      const result = await userPreferenceService.getUserPreferences('user-1');

      expect(result).toEqual(mockDefault);
      expect(mockPrisma.userWorkstationPreference.findUnique).toHaveBeenCalledWith({
        where: {
          userId_workstationId: {
            userId: 'user-1',
            workstationId: null
          }
        }
      });
    });

    it('should skip inactive preferences', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      const activeDefault = { ...mockUser, workstationId: null };

      (mockPrisma.userWorkstationPreference.findUnique as any)
        .mockResolvedValueOnce(inactiveUser) // workstation-specific (inactive)
        .mockResolvedValueOnce(activeDefault); // default (active)

      const result = await userPreferenceService.getUserPreferences('user-1', 'ws-1');

      expect(result).toEqual(activeDefault);
    });

    it('should handle database errors gracefully', async () => {
      (mockPrisma.userWorkstationPreference.findUnique as any).mockRejectedValueOnce(new Error('DB Error'));

      await expect(userPreferenceService.getUserPreferences('user-1')).rejects.toThrow('Get user preferences failed: DB Error');
    });
  });

  describe('saveUserPreferences', () => {
    const mockUpdated = {
      id: 'pref-1',
      userId: 'user-1',
      workstationId: 'ws-1',
      layoutMode: LayoutMode.SPLIT_HORIZONTAL,
      splitRatio: 0.7,
      panelPosition: PanelPosition.RIGHT,
      autoAdvanceSteps: true,
      showStepTimer: false,
      compactMode: true,
      useSecondMonitor: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should save user preferences successfully', async () => {
      const preferences: PreferenceUpdate = {
        layoutMode: LayoutMode.SPLIT_HORIZONTAL,
        splitRatio: 0.7,
        panelPosition: PanelPosition.RIGHT,
        autoAdvanceSteps: true,
        showStepTimer: false,
        compactMode: true,
        useSecondMonitor: true,
      };

      (mockPrisma.userWorkstationPreference.upsert as any).mockResolvedValueOnce(mockUpdated);

      const result = await userPreferenceService.saveUserPreferences('user-1', preferences, 'ws-1');

      expect(result).toEqual(mockUpdated);
      expect(mockPrisma.userWorkstationPreference.upsert).toHaveBeenCalledWith({
        where: {
          userId_workstationId: {
            userId: 'user-1',
            workstationId: 'ws-1'
          }
        },
        update: expect.objectContaining({
          ...preferences,
          updatedAt: expect.any(Date)
        }),
        create: expect.objectContaining({
          userId: 'user-1',
          workstationId: 'ws-1',
          layoutMode: LayoutMode.SPLIT_HORIZONTAL,
          splitRatio: 0.7,
          panelPosition: PanelPosition.RIGHT,
          autoAdvanceSteps: true,
          showStepTimer: false,
          compactMode: true,
          useSecondMonitor: true,
        })
      });
    });

    it('should save default preferences when no workstation specified', async () => {
      const preferences: PreferenceUpdate = {
        layoutMode: LayoutMode.SPLIT_HORIZONTAL,
      };

      (mockPrisma.userWorkstationPreference.upsert as any).mockResolvedValueOnce(mockUpdated);

      await userPreferenceService.saveUserPreferences('user-1', preferences);

      expect(mockPrisma.userWorkstationPreference.upsert).toHaveBeenCalledWith({
        where: {
          userId_workstationId: {
            userId: 'user-1',
            workstationId: null
          }
        },
        update: expect.objectContaining({
          layoutMode: LayoutMode.SPLIT_HORIZONTAL,
          updatedAt: expect.any(Date)
        }),
        create: expect.objectContaining({
          userId: 'user-1',
          workstationId: null,
          layoutMode: LayoutMode.SPLIT_HORIZONTAL,
          splitRatio: 0.6,
          panelPosition: PanelPosition.LEFT,
          autoAdvanceSteps: false,
          showStepTimer: true,
          compactMode: false,
          useSecondMonitor: false,
        })
      });
    });

    it('should handle secondMonitorPosition correctly', async () => {
      const preferences: PreferenceUpdate = {
        secondMonitorPosition: {
          x: 100,
          y: 200,
          width: 1920,
          height: 1080
        }
      };

      (mockPrisma.userWorkstationPreference.upsert as any).mockResolvedValueOnce(mockUpdated);

      await userPreferenceService.saveUserPreferences('user-1', preferences);

      expect(mockPrisma.userWorkstationPreference.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            secondMonitorPosition: preferences.secondMonitorPosition
          }),
          create: expect.objectContaining({
            secondMonitorPosition: preferences.secondMonitorPosition
          })
        })
      );
    });

    it('should validate split ratio range', async () => {
      const invalidPreferences: PreferenceUpdate = {
        splitRatio: 0.05 // Too low
      };

      await expect(userPreferenceService.saveUserPreferences('user-1', invalidPreferences))
        .rejects.toThrow('Split ratio must be between 0.1 and 0.9');

      const invalidPreferences2: PreferenceUpdate = {
        splitRatio: 0.95 // Too high
      };

      await expect(userPreferenceService.saveUserPreferences('user-1', invalidPreferences2))
        .rejects.toThrow('Split ratio must be between 0.1 and 0.9');
    });

    it('should validate touch target size', async () => {
      const invalidPreferences: PreferenceUpdate = {
        touchTargetSize: 20 // Too small
      };

      await expect(userPreferenceService.saveUserPreferences('user-1', invalidPreferences))
        .rejects.toThrow('Touch target size must be at least 24 pixels');
    });

    it('should handle database errors gracefully', async () => {
      (mockPrisma.userWorkstationPreference.upsert as any).mockRejectedValueOnce(new Error('DB Error'));

      await expect(userPreferenceService.saveUserPreferences('user-1', {}))
        .rejects.toThrow('Save user preferences failed: DB Error');
    });
  });

  describe('getWorkstationConfig', () => {
    const mockConfig = {
      id: 'config-1',
      workstationId: 'ws-1',
      screenWidth: 1920,
      screenHeight: 1080,
      isMultiMonitor: false,
      monitorCount: 1,
      forcedLayout: null,
      allowUserOverride: true,
      isTouchScreen: false,
      touchTargetSize: 48,
      updatedById: 'admin-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should return existing workstation config', async () => {
      (mockPrisma.workstationDisplayConfig.findUnique as any).mockResolvedValueOnce(mockConfig);

      const result = await userPreferenceService.getWorkstationConfig('ws-1');

      expect(result).toEqual(mockConfig);
      expect(mockPrisma.workstationDisplayConfig.findUnique).toHaveBeenCalledWith({
        where: { workstationId: 'ws-1' }
      });
    });

    it('should create default config when none exists', async () => {
      const mockDefaultConfig = {
        ...mockConfig,
        updatedById: 'system'
      };

      (mockPrisma.workstationDisplayConfig.findUnique as any).mockResolvedValueOnce(null);
      (mockPrisma.workstationDisplayConfig.create as any).mockResolvedValueOnce(mockDefaultConfig);

      const result = await userPreferenceService.getWorkstationConfig('ws-1');

      expect(result).toEqual(mockDefaultConfig);
      expect(mockPrisma.workstationDisplayConfig.create).toHaveBeenCalledWith({
        data: {
          workstationId: 'ws-1',
          isMultiMonitor: false,
          monitorCount: 1,
          allowUserOverride: true,
          isTouchScreen: false,
          touchTargetSize: 48,
          updatedById: 'system'
        }
      });
    });

    it('should handle database errors gracefully', async () => {
      (mockPrisma.workstationDisplayConfig.findUnique as any).mockRejectedValueOnce(new Error('DB Error'));

      await expect(userPreferenceService.getWorkstationConfig('ws-1'))
        .rejects.toThrow('Get workstation config failed: DB Error');
    });
  });

  describe('updateWorkstationConfig', () => {
    const mockUpdatedConfig = {
      id: 'config-1',
      workstationId: 'ws-1',
      screenWidth: 2560,
      screenHeight: 1440,
      isMultiMonitor: true,
      monitorCount: 2,
      forcedLayout: LayoutMode.SPLIT_HORIZONTAL,
      allowUserOverride: false,
      isTouchScreen: true,
      touchTargetSize: 64,
      updatedById: 'admin-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should update workstation config successfully', async () => {
      const configUpdate: ConfigUpdate = {
        screenWidth: 2560,
        screenHeight: 1440,
        isMultiMonitor: true,
        monitorCount: 2,
        forcedLayout: LayoutMode.SPLIT_HORIZONTAL,
        allowUserOverride: false,
        isTouchScreen: true,
        touchTargetSize: 64,
      };

      (mockPrisma.workstationDisplayConfig.upsert as any).mockResolvedValueOnce(mockUpdatedConfig);

      const result = await userPreferenceService.updateWorkstationConfig('ws-1', configUpdate, 'admin-1');

      expect(result).toEqual(mockUpdatedConfig);
      expect(mockPrisma.workstationDisplayConfig.upsert).toHaveBeenCalledWith({
        where: { workstationId: 'ws-1' },
        update: {
          ...configUpdate,
          updatedAt: expect.any(Date),
          updatedById: 'admin-1'
        },
        create: {
          workstationId: 'ws-1',
          screenWidth: 2560,
          screenHeight: 1440,
          isMultiMonitor: true,
          monitorCount: 2,
          forcedLayout: LayoutMode.SPLIT_HORIZONTAL,
          allowUserOverride: false,
          isTouchScreen: true,
          touchTargetSize: 64,
          updatedById: 'admin-1'
        }
      });
    });

    it('should validate monitor count', async () => {
      const invalidConfig: ConfigUpdate = {
        monitorCount: 0 // Invalid
      };

      await expect(userPreferenceService.updateWorkstationConfig('ws-1', invalidConfig, 'admin-1'))
        .rejects.toThrow('Monitor count must be at least 1');
    });

    it('should validate screen dimensions', async () => {
      const invalidConfig1: ConfigUpdate = {
        screenWidth: 700 // Too small
      };

      await expect(userPreferenceService.updateWorkstationConfig('ws-1', invalidConfig1, 'admin-1'))
        .rejects.toThrow('Screen width must be at least 800 pixels');

      const invalidConfig2: ConfigUpdate = {
        screenHeight: 500 // Too small
      };

      await expect(userPreferenceService.updateWorkstationConfig('ws-1', invalidConfig2, 'admin-1'))
        .rejects.toThrow('Screen height must be at least 600 pixels');
    });

    it('should handle database errors gracefully', async () => {
      (mockPrisma.workstationDisplayConfig.upsert as any).mockRejectedValueOnce(new Error('DB Error'));

      await expect(userPreferenceService.updateWorkstationConfig('ws-1', {}, 'admin-1'))
        .rejects.toThrow('Update workstation config failed: DB Error');
    });
  });

  describe('resetToDefaults', () => {
    const mockResetPrefs = {
      id: 'pref-1',
      userId: 'user-1',
      workstationId: null,
      layoutMode: LayoutMode.SPLIT_VERTICAL,
      splitRatio: 0.6,
      panelPosition: PanelPosition.LEFT,
      autoAdvanceSteps: false,
      showStepTimer: true,
      compactMode: false,
      useSecondMonitor: false,
      secondMonitorPosition: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should reset user preferences to defaults', async () => {
      (mockPrisma.userWorkstationPreference.upsert as any).mockResolvedValueOnce(mockResetPrefs);

      const result = await userPreferenceService.resetToDefaults('user-1');

      expect(result).toEqual(mockResetPrefs);
      expect(mockPrisma.userWorkstationPreference.upsert).toHaveBeenCalledWith({
        where: {
          userId_workstationId: {
            userId: 'user-1',
            workstationId: null
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
          updatedAt: expect.any(Date)
        },
        create: {
          userId: 'user-1',
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
    });

    it('should reset workstation-specific preferences', async () => {
      const workstationReset = { ...mockResetPrefs, workstationId: 'ws-1' };
      (mockPrisma.userWorkstationPreference.upsert as any).mockResolvedValueOnce(workstationReset);

      await userPreferenceService.resetToDefaults('user-1', 'ws-1');

      expect(mockPrisma.userWorkstationPreference.upsert).toHaveBeenCalledWith({
        where: {
          userId_workstationId: {
            userId: 'user-1',
            workstationId: 'ws-1'
          }
        },
        update: expect.objectContaining({
          layoutMode: LayoutMode.SPLIT_VERTICAL,
          splitRatio: 0.6,
        }),
        create: expect.objectContaining({
          userId: 'user-1',
          workstationId: 'ws-1',
        })
      });
    });

    it('should handle database errors gracefully', async () => {
      (mockPrisma.userWorkstationPreference.upsert as any).mockRejectedValueOnce(new Error('DB Error'));

      await expect(userPreferenceService.resetToDefaults('user-1'))
        .rejects.toThrow('Reset to defaults failed: DB Error');
    });
  });

  describe('exportPreferences', () => {
    const mockPrefs = {
      layoutMode: LayoutMode.SPLIT_HORIZONTAL,
      splitRatio: 0.7,
      panelPosition: PanelPosition.RIGHT,
      autoAdvanceSteps: true,
      showStepTimer: false,
      compactMode: true,
      useSecondMonitor: true,
      secondMonitorPosition: { x: 100, y: 200, width: 1920, height: 1080 }
    };

    it('should export user preferences successfully', async () => {
      // Mock getUserPreferences call
      vi.spyOn(userPreferenceService, 'getUserPreferences').mockResolvedValueOnce(mockPrefs);

      const result = await userPreferenceService.exportPreferences('user-1');

      expect(result).toEqual({
        preferences: mockPrefs,
        exportedAt: expect.any(Date),
        version: '1.0'
      });
    });

    it('should handle errors during export', async () => {
      vi.spyOn(userPreferenceService, 'getUserPreferences').mockRejectedValueOnce(new Error('Get Error'));

      await expect(userPreferenceService.exportPreferences('user-1'))
        .rejects.toThrow('Export preferences failed: Get Error');
    });
  });

  describe('importPreferences', () => {
    const mockImportData: PreferenceExport = {
      preferences: {
        layoutMode: LayoutMode.SPLIT_HORIZONTAL,
        splitRatio: 0.7,
        panelPosition: PanelPosition.RIGHT,
        autoAdvanceSteps: true,
        showStepTimer: false,
        compactMode: true,
        useSecondMonitor: true,
      },
      exportedAt: new Date(),
      version: '1.0'
    };

    it('should import user preferences successfully', async () => {
      vi.spyOn(userPreferenceService, 'saveUserPreferences').mockResolvedValueOnce({} as any);

      await userPreferenceService.importPreferences('user-1', mockImportData);

      expect(userPreferenceService.saveUserPreferences).toHaveBeenCalledWith('user-1', mockImportData.preferences);
    });

    it('should validate import data format', async () => {
      const invalidData = {
        preferences: null,
        version: '1.0'
      } as any;

      await expect(userPreferenceService.importPreferences('user-1', invalidData))
        .rejects.toThrow('Invalid import data format');

      const invalidData2 = {
        preferences: {},
        version: null
      } as any;

      await expect(userPreferenceService.importPreferences('user-1', invalidData2))
        .rejects.toThrow('Invalid import data format');
    });

    it('should handle errors during import', async () => {
      vi.spyOn(userPreferenceService, 'saveUserPreferences').mockRejectedValueOnce(new Error('Save Error'));

      await expect(userPreferenceService.importPreferences('user-1', mockImportData))
        .rejects.toThrow('Import preferences failed: Save Error');
    });
  });

  describe('getAllUserPreferences', () => {
    const mockAllPrefs = [
      {
        id: 'pref-1',
        userId: 'user-1',
        workstationId: null,
        layoutMode: LayoutMode.SPLIT_VERTICAL,
        isActive: true,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date(),
      },
      {
        id: 'pref-2',
        userId: 'user-1',
        workstationId: 'ws-1',
        layoutMode: LayoutMode.SPLIT_HORIZONTAL,
        isActive: true,
        createdAt: new Date('2023-01-02'),
        updatedAt: new Date(),
      },
    ];

    it('should get all user preferences successfully', async () => {
      (mockPrisma.userWorkstationPreference.findMany as any).mockResolvedValueOnce(mockAllPrefs);

      const result = await userPreferenceService.getAllUserPreferences('user-1');

      expect(result).toEqual(mockAllPrefs);
      expect(mockPrisma.userWorkstationPreference.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          isActive: true
        },
        orderBy: [
          { workstationId: 'asc' },
          { createdAt: 'desc' }
        ]
      });
    });

    it('should handle empty results', async () => {
      (mockPrisma.userWorkstationPreference.findMany as any).mockResolvedValueOnce([]);

      const result = await userPreferenceService.getAllUserPreferences('user-1');

      expect(result).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      (mockPrisma.userWorkstationPreference.findMany as any).mockRejectedValueOnce(new Error('DB Error'));

      await expect(userPreferenceService.getAllUserPreferences('user-1'))
        .rejects.toThrow('Get all user preferences failed: DB Error');
    });
  });

  describe('isLayoutModeAllowed', () => {
    const mockConfig = {
      forcedLayout: LayoutMode.SPLIT_HORIZONTAL,
      allowUserOverride: false,
    };

    it('should return false when layout is forced and different', async () => {
      vi.spyOn(userPreferenceService, 'getWorkstationConfig').mockResolvedValueOnce(mockConfig);

      const result = await userPreferenceService.isLayoutModeAllowed('ws-1', LayoutMode.SPLIT_VERTICAL);

      expect(result).toBe(false);
    });

    it('should return true when layout matches forced layout', async () => {
      vi.spyOn(userPreferenceService, 'getWorkstationConfig').mockResolvedValueOnce(mockConfig);

      const result = await userPreferenceService.isLayoutModeAllowed('ws-1', LayoutMode.SPLIT_HORIZONTAL);

      expect(result).toBe(true);
    });

    it('should return true when user override is allowed', async () => {
      const configWithOverride = { ...mockConfig, allowUserOverride: true };
      vi.spyOn(userPreferenceService, 'getWorkstationConfig').mockResolvedValueOnce(configWithOverride);

      const result = await userPreferenceService.isLayoutModeAllowed('ws-1', LayoutMode.SPLIT_VERTICAL);

      expect(result).toBe(true);
    });

    it('should return true when no forced layout is set', async () => {
      const configNoForced = { forcedLayout: null, allowUserOverride: true };
      vi.spyOn(userPreferenceService, 'getWorkstationConfig').mockResolvedValueOnce(configNoForced);

      const result = await userPreferenceService.isLayoutModeAllowed('ws-1', LayoutMode.SPLIT_VERTICAL);

      expect(result).toBe(true);
    });

    it('should return true when config check fails', async () => {
      vi.spyOn(userPreferenceService, 'getWorkstationConfig').mockRejectedValueOnce(new Error('Config Error'));

      const result = await userPreferenceService.isLayoutModeAllowed('ws-1', LayoutMode.SPLIT_VERTICAL);

      expect(result).toBe(true);
    });
  });

  describe('disconnect', () => {
    it('should disconnect prisma client', async () => {
      await userPreferenceService.disconnect();

      expect(mockPrisma.$disconnect).toHaveBeenCalled();
    });
  });

  describe('edge cases and validation', () => {
    it('should handle empty string user IDs', async () => {
      (mockPrisma.userWorkstationPreference.findUnique as any).mockResolvedValueOnce(null);
      (mockPrisma.userWorkstationPreference.create as any).mockResolvedValueOnce({
        userId: '',
        workstationId: null,
        layoutMode: LayoutMode.SPLIT_VERTICAL,
      });

      const result = await userPreferenceService.getUserPreferences('');

      expect(result.userId).toBe('');
    });

    it('should handle very long workstation IDs', async () => {
      const longId = 'a'.repeat(1000);
      const mockConfig = { workstationId: longId };

      (mockPrisma.workstationDisplayConfig.findUnique as any).mockResolvedValueOnce(mockConfig);

      const result = await userPreferenceService.getWorkstationConfig(longId);

      expect(result.workstationId).toBe(longId);
    });

    it('should handle special characters in IDs', async () => {
      const specialId = 'ws-123-äöü-@#$%';
      const mockUser = {
        id: 'pref-special-123',
        userId: 'user-äöü',
        workstationId: specialId,
        layoutMode: LayoutMode.SPLIT_VERTICAL,
        splitRatio: 0.6,
        panelPosition: PanelPosition.LEFT,
        autoAdvanceSteps: false,
        showStepTimer: true,
        compactMode: false,
        useSecondMonitor: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (mockPrisma.userWorkstationPreference.findUnique as any).mockResolvedValueOnce(mockUser);

      const result = await userPreferenceService.getUserPreferences('user-äöü', specialId);

      expect(result.workstationId).toBe(specialId);
    });

    it('should handle minimal preference updates', async () => {
      const minimalUpdate: PreferenceUpdate = {};
      const mockResult = { id: 'pref-1' };

      (mockPrisma.userWorkstationPreference.upsert as any).mockResolvedValueOnce(mockResult);

      const result = await userPreferenceService.saveUserPreferences('user-1', minimalUpdate);

      expect(result).toEqual(mockResult);
    });

    it('should handle boundary values for split ratio', async () => {
      const validBoundary1: PreferenceUpdate = { splitRatio: 0.1 };
      const validBoundary2: PreferenceUpdate = { splitRatio: 0.9 };

      (mockPrisma.userWorkstationPreference.upsert as any).mockResolvedValue({});

      await expect(userPreferenceService.saveUserPreferences('user-1', validBoundary1)).resolves.toBeDefined();
      await expect(userPreferenceService.saveUserPreferences('user-1', validBoundary2)).resolves.toBeDefined();
    });

    it('should handle boundary values for touch target size', async () => {
      const validBoundary: PreferenceUpdate = { touchTargetSize: 24 };

      (mockPrisma.userWorkstationPreference.upsert as any).mockResolvedValue({});

      await expect(userPreferenceService.saveUserPreferences('user-1', validBoundary)).resolves.toBeDefined();
    });
  });
});