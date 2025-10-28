/**
 * OverlayLayout (Placeholder)
 *
 * GitHub Issue #19: Configurable Side-by-Side Execution Interface
 */

import React from 'react';
import { Card } from 'antd';
import { InstructionPanel } from '../panels/InstructionPanel';
import { DataCollectionPanel } from '../panels/DataCollectionPanel';
import { useExecutionSession } from '@/store/executionLayoutStore';

interface OverlayLayoutProps {
  session: any;
  onExecutionComplete?: () => void;
}

export const OverlayLayout: React.FC<OverlayLayoutProps> = ({
  session,
  onExecutionComplete,
}) => {
  const { currentStepNumber } = useExecutionSession();
  const currentStep = session?.steps?.find((step: any) => step.stepNumber === currentStepNumber);

  return (
    <div style={{ position: 'relative', height: '100%' }}>
      {/* Main content - Data Collection */}
      <div style={{ height: '100%' }}>
        {currentStep ? (
          <DataCollectionPanel
            step={currentStep}
            session={session}
            onExecutionComplete={onExecutionComplete}
          />
        ) : <div>No step data available</div>}
      </div>

      {/* Overlay - Instructions */}
      <Card
        title="Work Instructions"
        size="small"
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          width: 400,
          maxHeight: 300,
          opacity: 0.95,
          zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        }}
      >
        {currentStep ? (
          <div style={{ maxHeight: 200, overflow: 'auto' }}>
            <h4>{currentStep.title}</h4>
            <p>{currentStep.content}</p>
          </div>
        ) : <div>No step data available</div>}
      </Card>
    </div>
  );
};

export default OverlayLayout;