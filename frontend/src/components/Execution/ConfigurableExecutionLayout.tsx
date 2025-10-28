/**
 * ConfigurableExecutionLayout
 *
 * GitHub Issue #19: Configurable Side-by-Side Execution Interface
 *
 * Main container component that manages the configurable layout for work instruction
 * execution. Provides different layout modes (split-screen, tabbed, overlay, PiP)
 * and integrates instruction display with data collection.
 */

import React, { useEffect, useCallback } from 'react';
import { Button, Tooltip, message } from 'antd';
import {
  SettingOutlined,
  LayoutOutlined,
  ExpandOutlined,
  CompressOutlined,
} from '@ant-design/icons';
import { useExecutionLayoutStore, LayoutMode, useLayoutConfig, useExecutionSession } from '@/store/executionLayoutStore';
import { SplitScreenLayout } from './layouts/SplitScreenLayout';
import { TabbedLayout } from './layouts/TabbedLayout';
import { OverlayLayout } from './layouts/OverlayLayout';
import { PictureInPictureLayout } from './layouts/PictureInPictureLayout';
import { LayoutPreferenceModal } from './LayoutPreferenceModal';
import { KeyboardShortcutHandler } from './KeyboardShortcutHandler';
import styles from './ConfigurableExecutionLayout.module.css';

interface ConfigurableExecutionLayoutProps {
  workOrderId: string;
  operationNumber: number;
  workInstructionId?: string;
  onExecutionComplete?: () => void;
  className?: string;
}

export const ConfigurableExecutionLayout: React.FC<ConfigurableExecutionLayoutProps> = ({
  workOrderId,
  operationNumber,
  workInstructionId,
  onExecutionComplete,
  className,
}) => {
  const {
    layoutMode,
    instructionPanelVisible,
    dataCollectionPanelVisible,
  } = useLayoutConfig();

  const { session, isActive } = useExecutionSession();

  const {
    setLayoutMode,
    toggleLayoutSelector,
    togglePreferenceModal,
    showLayoutSelector,
    showPreferenceModal,
    startExecutionSession,
    endExecutionSession,
    loadUserPreferences,
    loadWorkstationConfig,
    error,
    clearError,
  } = useExecutionLayoutStore();

  // Load user preferences and workstation configuration on mount
  useEffect(() => {
    const initializeLayout = async () => {
      try {
        // TODO: Get actual user ID and workstation ID from context/auth
        const userId = 'current-user'; // Placeholder
        const workstationId = 'workstation-1'; // Placeholder

        await loadUserPreferences(userId, workstationId);
        await loadWorkstationConfig(workstationId);
      } catch (err) {
        console.error('Failed to initialize layout:', err);
        message.error('Failed to load layout preferences');
      }
    };

    initializeLayout();
  }, [loadUserPreferences, loadWorkstationConfig]);

  // Initialize execution session when component mounts with required data
  useEffect(() => {
    if (workOrderId && operationNumber && !isActive) {
      // TODO: Load work instruction steps from API
      const mockSteps = [
        {
          stepId: 'step-1',
          stepNumber: 1,
          title: 'Setup and Preparation',
          content: 'Prepare the workstation and gather required materials.',
          estimatedDuration: 300,
          isCritical: false,
          requiresSignature: false,
          isCompleted: false,
          dataEntryFields: [
            {
              id: 'setup_time',
              name: 'setup_time',
              type: 'number',
              label: 'Setup Time (minutes)',
              required: true,
            },
          ],
        },
        {
          stepId: 'step-2',
          stepNumber: 2,
          title: 'Quality Check',
          content: 'Perform initial quality inspection of materials.',
          estimatedDuration: 180,
          isCritical: true,
          requiresSignature: true,
          isCompleted: false,
          dataEntryFields: [
            {
              id: 'quality_pass',
              name: 'quality_pass',
              type: 'boolean',
              label: 'Quality Check Passed',
              required: true,
            },
            {
              id: 'inspector_id',
              name: 'inspector_id',
              type: 'text',
              label: 'Inspector ID',
              required: true,
            },
          ],
        },
      ];

      startExecutionSession({
        workOrderId,
        operationNumber,
        workInstructionId,
        currentStepNumber: 1,
        totalSteps: mockSteps.length,
        steps: mockSteps,
      });
    }
  }, [workOrderId, operationNumber, workInstructionId, isActive, startExecutionSession]);

  // Handle layout mode changes with validation
  const handleLayoutModeChange = useCallback((mode: LayoutMode) => {
    try {
      setLayoutMode(mode);
      message.success(`Switched to ${mode.replace('_', ' ').toLowerCase()} layout`);
    } catch (err) {
      message.error('Failed to change layout mode');
    }
  }, [setLayoutMode]);

  // Handle execution completion
  const handleExecutionComplete = useCallback(() => {
    endExecutionSession();
    onExecutionComplete?.();
    message.success('Work order execution completed');
  }, [endExecutionSession, onExecutionComplete]);

  // Handle keyboard shortcuts
  const handleKeyboardShortcut = useCallback((shortcut: string) => {
    switch (shortcut) {
      case 'Ctrl+1':
        if (layoutMode === LayoutMode.TABBED) {
          // Switch to instructions tab
          console.log('Switch to instructions tab');
        }
        break;
      case 'Ctrl+2':
        if (layoutMode === LayoutMode.TABBED) {
          // Switch to data collection tab
          console.log('Switch to data collection tab');
        }
        break;
      case 'Ctrl+\\':
        toggleLayoutSelector();
        break;
      case 'F11':
        // Toggle fullscreen
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          document.documentElement.requestFullscreen();
        }
        break;
      default:
        break;
    }
  }, [layoutMode, toggleLayoutSelector]);

  // Clear error messages
  useEffect(() => {
    if (error) {
      message.error(error);
      clearError();
    }
  }, [error, clearError]);

  // Render the appropriate layout based on current mode
  const renderLayout = () => {
    if (!session) {
      return (
        <div className={styles.noSession}>
          <p>No active execution session</p>
        </div>
      );
    }

    const layoutProps = {
      session,
      onExecutionComplete: handleExecutionComplete,
    };

    switch (layoutMode) {
      case LayoutMode.SPLIT_VERTICAL:
      case LayoutMode.SPLIT_HORIZONTAL:
        return <SplitScreenLayout {...layoutProps} />;
      case LayoutMode.TABBED:
        return <TabbedLayout {...layoutProps} />;
      case LayoutMode.OVERLAY:
        return <OverlayLayout {...layoutProps} />;
      case LayoutMode.PICTURE_IN_PICTURE:
        return <PictureInPictureLayout {...layoutProps} />;
      default:
        return <SplitScreenLayout {...layoutProps} />;
    }
  };

  return (
    <div className={`${styles.container} ${className || ''}`}>
      {/* Keyboard shortcut handler */}
      <KeyboardShortcutHandler onShortcut={handleKeyboardShortcut} />

      {/* Layout controls toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <Tooltip title="Layout Options">
            <Button
              icon={<LayoutOutlined />}
              onClick={toggleLayoutSelector}
              type={showLayoutSelector ? 'primary' : 'default'}
              size="small"
            >
              Layout
            </Button>
          </Tooltip>

          {showLayoutSelector && (
            <div className={styles.layoutSelector}>
              <Button
                size="small"
                type={layoutMode === LayoutMode.SPLIT_VERTICAL ? 'primary' : 'default'}
                onClick={() => handleLayoutModeChange(LayoutMode.SPLIT_VERTICAL)}
              >
                Split Vertical
              </Button>
              <Button
                size="small"
                type={layoutMode === LayoutMode.SPLIT_HORIZONTAL ? 'primary' : 'default'}
                onClick={() => handleLayoutModeChange(LayoutMode.SPLIT_HORIZONTAL)}
              >
                Split Horizontal
              </Button>
              <Button
                size="small"
                type={layoutMode === LayoutMode.TABBED ? 'primary' : 'default'}
                onClick={() => handleLayoutModeChange(LayoutMode.TABBED)}
              >
                Tabbed
              </Button>
              <Button
                size="small"
                type={layoutMode === LayoutMode.OVERLAY ? 'primary' : 'default'}
                onClick={() => handleLayoutModeChange(LayoutMode.OVERLAY)}
              >
                Overlay
              </Button>
              <Button
                size="small"
                type={layoutMode === LayoutMode.PICTURE_IN_PICTURE ? 'primary' : 'default'}
                onClick={() => handleLayoutModeChange(LayoutMode.PICTURE_IN_PICTURE)}
              >
                Picture-in-Picture
              </Button>
            </div>
          )}
        </div>

        <div className={styles.toolbarRight}>
          <Tooltip title="Preferences">
            <Button
              icon={<SettingOutlined />}
              onClick={togglePreferenceModal}
              size="small"
            >
              Preferences
            </Button>
          </Tooltip>

          <Tooltip title="Toggle Fullscreen (F11)">
            <Button
              icon={document.fullscreenElement ? <CompressOutlined /> : <ExpandOutlined />}
              onClick={() => handleKeyboardShortcut('F11')}
              size="small"
            />
          </Tooltip>
        </div>
      </div>

      {/* Main layout area */}
      <div className={styles.layoutArea}>
        {renderLayout()}
      </div>

      {/* Preference modal */}
      <LayoutPreferenceModal
        visible={showPreferenceModal}
        onClose={togglePreferenceModal}
        onSave={(preferences) => {
          // Handle preference saving
          message.success('Preferences saved');
          togglePreferenceModal();
        }}
      />

      {/* Status information */}
      {session && (
        <div className={styles.statusBar}>
          <span>Work Order: {session.workOrderId}</span>
          <span>Operation: {session.operationNumber}</span>
          <span>Step: {session.currentStepNumber} of {session.totalSteps}</span>
          <span>Layout: {layoutMode.replace('_', ' ')}</span>
        </div>
      )}
    </div>
  );
};

export default ConfigurableExecutionLayout;