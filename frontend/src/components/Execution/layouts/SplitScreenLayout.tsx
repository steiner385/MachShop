/**
 * SplitScreenLayout
 *
 * GitHub Issue #19: Configurable Side-by-Side Execution Interface
 *
 * Implements split-screen layout with adjustable divider for side-by-side viewing
 * of work instructions and data collection. Supports both vertical and horizontal splits.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button, Tooltip } from 'antd';
import {
  ExpandOutlined,
  CompressOutlined,
  ColumnWidthOutlined,
  ColumnHeightOutlined,
} from '@ant-design/icons';
import { useExecutionLayoutStore, LayoutMode, useLayoutConfig, useExecutionSession } from '@/store/executionLayoutStore';
import { InstructionPanel } from '../panels/InstructionPanel';
import { DataCollectionPanel } from '../panels/DataCollectionPanel';
import styles from './SplitScreenLayout.module.css';

interface SplitScreenLayoutProps {
  session: any; // ExecutionSession from store
  onExecutionComplete?: () => void;
}

export const SplitScreenLayout: React.FC<SplitScreenLayoutProps> = ({
  session,
  onExecutionComplete,
}) => {
  const {
    layoutMode,
    splitRatio,
    instructionPanelVisible,
    dataCollectionPanelVisible,
    instructionPanelCollapsed,
    dataCollectionPanelCollapsed,
  } = useLayoutConfig();

  const { currentStepNumber } = useExecutionSession();

  const {
    setSplitRatio,
    togglePanelCollapse,
    expandPanel,
    collapsePanel,
  } = useExecutionLayoutStore();

  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPosition, setDragStartPosition] = useState({ x: 0, y: 0 });
  const [dragStartRatio, setDragStartRatio] = useState(splitRatio);
  const containerRef = useRef<HTMLDivElement>(null);
  const dividerRef = useRef<HTMLDivElement>(null);

  const isVerticalSplit = layoutMode === LayoutMode.SPLIT_VERTICAL;
  const isHorizontalSplit = layoutMode === LayoutMode.SPLIT_HORIZONTAL;

  // Preset split ratios for quick snapping
  const PRESET_RATIOS = [0.25, 0.33, 0.5, 0.6, 0.67, 0.75];

  // Handle divider drag start
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStartPosition({ x: e.clientX, y: e.clientY });
    setDragStartRatio(splitRatio);

    // Add global event listeners
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
  }, [splitRatio]);

  // Handle divider drag move
  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    let newRatio: number;

    if (isVerticalSplit) {
      const deltaX = e.clientX - dragStartPosition.x;
      const containerWidth = containerRect.width;
      const deltaRatio = deltaX / containerWidth;
      newRatio = dragStartRatio + deltaRatio;
    } else {
      const deltaY = e.clientY - dragStartPosition.y;
      const containerHeight = containerRect.height;
      const deltaRatio = deltaY / containerHeight;
      newRatio = dragStartRatio + deltaRatio;
    }

    // Constrain ratio to valid bounds
    newRatio = Math.max(0.1, Math.min(0.9, newRatio));

    // Check for snap to presets
    const SNAP_THRESHOLD = 0.02;
    for (const preset of PRESET_RATIOS) {
      if (Math.abs(newRatio - preset) < SNAP_THRESHOLD) {
        newRatio = preset;
        break;
      }
    }

    setSplitRatio(newRatio);
  }, [isDragging, dragStartPosition, dragStartRatio, isVerticalSplit, setSplitRatio]);

  // Handle divider drag end
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);

    // Remove global event listeners
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
  }, [handleDragMove]);

  // Cleanup event listeners on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
    };
  }, [handleDragMove, handleDragEnd]);

  // Handle keyboard navigation for divider
  const handleDividerKeyDown = useCallback((e: React.KeyboardEvent) => {
    const step = 0.05;
    let newRatio = splitRatio;

    if (isVerticalSplit) {
      if (e.key === 'ArrowLeft') {
        newRatio = Math.max(0.1, splitRatio - step);
      } else if (e.key === 'ArrowRight') {
        newRatio = Math.min(0.9, splitRatio + step);
      }
    } else {
      if (e.key === 'ArrowUp') {
        newRatio = Math.max(0.1, splitRatio - step);
      } else if (e.key === 'ArrowDown') {
        newRatio = Math.min(0.9, splitRatio + step);
      }
    }

    if (newRatio !== splitRatio) {
      e.preventDefault();
      setSplitRatio(newRatio);
    }
  }, [splitRatio, isVerticalSplit, setSplitRatio]);

  // Get current step data
  const currentStep = session?.steps?.find((step: any) => step.stepNumber === currentStepNumber);

  // Calculate panel styles based on split ratio and collapsed state
  const getPanelStyles = () => {
    if (isVerticalSplit) {
      const firstPanelWidth = instructionPanelCollapsed ? '40px' : `${splitRatio * 100}%`;
      const secondPanelWidth = dataCollectionPanelCollapsed ? '40px' : `${(1 - splitRatio) * 100}%`;

      return {
        firstPanel: {
          width: firstPanelWidth,
          height: '100%',
          minWidth: instructionPanelCollapsed ? '40px' : '200px',
        },
        secondPanel: {
          width: secondPanelWidth,
          height: '100%',
          minWidth: dataCollectionPanelCollapsed ? '40px' : '200px',
        },
        divider: {
          width: '4px',
          height: '100%',
          cursor: 'col-resize',
        },
      };
    } else {
      const firstPanelHeight = instructionPanelCollapsed ? '40px' : `${splitRatio * 100}%`;
      const secondPanelHeight = dataCollectionPanelCollapsed ? '40px' : `${(1 - splitRatio) * 100}%`;

      return {
        firstPanel: {
          width: '100%',
          height: firstPanelHeight,
          minHeight: instructionPanelCollapsed ? '40px' : '150px',
        },
        secondPanel: {
          width: '100%',
          height: secondPanelHeight,
          minHeight: dataCollectionPanelCollapsed ? '40px' : '150px',
        },
        divider: {
          width: '100%',
          height: '4px',
          cursor: 'row-resize',
        },
      };
    }
  };

  const panelStyles = getPanelStyles();

  return (
    <div
      ref={containerRef}
      className={`${styles.container} ${isVerticalSplit ? styles.vertical : styles.horizontal}`}
    >
      {/* First Panel - Usually Instructions */}
      {instructionPanelVisible && (
        <div
          className={`${styles.panel} ${styles.firstPanel} ${instructionPanelCollapsed ? styles.collapsed : ''}`}
          style={panelStyles.firstPanel}
        >
          {/* Panel header with controls */}
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>Work Instructions</span>
            <div className={styles.panelControls}>
              <Tooltip title={instructionPanelCollapsed ? 'Expand panel' : 'Collapse panel'}>
                <Button
                  size="small"
                  icon={instructionPanelCollapsed ? <ExpandOutlined /> : <CompressOutlined />}
                  onClick={() => togglePanelCollapse('instruction')}
                />
              </Tooltip>
            </div>
          </div>

          {/* Panel content */}
          <div className={styles.panelContent}>
            {!instructionPanelCollapsed && currentStep && (
              <InstructionPanel
                step={currentStep}
                session={session}
                isCollapsed={instructionPanelCollapsed}
              />
            )}
          </div>
        </div>
      )}

      {/* Resizable Divider */}
      {instructionPanelVisible && dataCollectionPanelVisible && !instructionPanelCollapsed && !dataCollectionPanelCollapsed && (
        <div
          ref={dividerRef}
          className={`${styles.divider} ${isDragging ? styles.dragging : ''}`}
          style={panelStyles.divider}
          onMouseDown={handleDragStart}
          onKeyDown={handleDividerKeyDown}
          tabIndex={0}
          role="separator"
          aria-label={`Resize panels. Use ${isVerticalSplit ? 'left/right' : 'up/down'} arrow keys to adjust.`}
          aria-valuenow={Math.round(splitRatio * 100)}
          aria-valuemin={10}
          aria-valuemax={90}
        >
          <div className={styles.dividerHandle}>
            {isVerticalSplit ? <ColumnWidthOutlined /> : <ColumnHeightOutlined />}
          </div>

          {/* Split ratio indicator */}
          {isDragging && (
            <div className={styles.ratioIndicator}>
              {Math.round(splitRatio * 100)}% / {Math.round((1 - splitRatio) * 100)}%
            </div>
          )}
        </div>
      )}

      {/* Second Panel - Usually Data Collection */}
      {dataCollectionPanelVisible && (
        <div
          className={`${styles.panel} ${styles.secondPanel} ${dataCollectionPanelCollapsed ? styles.collapsed : ''}`}
          style={panelStyles.secondPanel}
        >
          {/* Panel header with controls */}
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>Data Collection</span>
            <div className={styles.panelControls}>
              <Tooltip title={dataCollectionPanelCollapsed ? 'Expand panel' : 'Collapse panel'}>
                <Button
                  size="small"
                  icon={dataCollectionPanelCollapsed ? <ExpandOutlined /> : <CompressOutlined />}
                  onClick={() => togglePanelCollapse('data')}
                />
              </Tooltip>
            </div>
          </div>

          {/* Panel content */}
          <div className={styles.panelContent}>
            {!dataCollectionPanelCollapsed && currentStep && (
              <DataCollectionPanel
                step={currentStep}
                session={session}
                onExecutionComplete={onExecutionComplete}
                isCollapsed={dataCollectionPanelCollapsed}
              />
            )}
          </div>
        </div>
      )}

      {/* Quick split ratio presets (visible during drag) */}
      {isDragging && (
        <div className={styles.presetRatios}>
          {PRESET_RATIOS.map((ratio) => (
            <Button
              key={ratio}
              size="small"
              type={Math.abs(splitRatio - ratio) < 0.01 ? 'primary' : 'default'}
              onClick={() => setSplitRatio(ratio)}
            >
              {Math.round(ratio * 100)}%
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SplitScreenLayout;