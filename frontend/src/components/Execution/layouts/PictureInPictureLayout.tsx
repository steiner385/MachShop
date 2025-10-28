/**
 * PictureInPictureLayout (Placeholder)
 *
 * GitHub Issue #19: Configurable Side-by-Side Execution Interface
 */

import React from 'react';
import { Alert } from 'antd';
import { DataCollectionPanel } from '../panels/DataCollectionPanel';
import { useExecutionSession } from '@/store/executionLayoutStore';

interface PictureInPictureLayoutProps {
  session: any;
  onExecutionComplete?: () => void;
}

export const PictureInPictureLayout: React.FC<PictureInPictureLayoutProps> = ({
  session,
  onExecutionComplete,
}) => {
  const { currentStepNumber } = useExecutionSession();
  const currentStep = session?.steps?.find((step: any) => step.stepNumber === currentStepNumber);

  return (
    <div style={{ height: '100%' }}>
      <Alert
        message="Picture-in-Picture Mode"
        description="Instructions will open in a separate floating window. Focus on data collection here."
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      {currentStep ? (
        <DataCollectionPanel
          step={currentStep}
          session={session}
          onExecutionComplete={onExecutionComplete}
        />
      ) : <div>No step data available</div>}
    </div>
  );
};

export default PictureInPictureLayout;