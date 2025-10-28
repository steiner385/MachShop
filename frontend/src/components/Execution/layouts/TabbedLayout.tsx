/**
 * TabbedLayout (Placeholder)
 *
 * GitHub Issue #19: Configurable Side-by-Side Execution Interface
 */

import React from 'react';
import { Tabs } from 'antd';
import { InstructionPanel } from '../panels/InstructionPanel';
import { DataCollectionPanel } from '../panels/DataCollectionPanel';
import { useExecutionSession } from '@/store/executionLayoutStore';

interface TabbedLayoutProps {
  session: any;
  onExecutionComplete?: () => void;
}

export const TabbedLayout: React.FC<TabbedLayoutProps> = ({
  session,
  onExecutionComplete,
}) => {
  const { currentStepNumber } = useExecutionSession();
  const currentStep = session?.steps?.find((step: any) => step.stepNumber === currentStepNumber);

  const items = [
    {
      key: 'instructions',
      label: 'Work Instructions',
      children: currentStep ? (
        <InstructionPanel
          step={currentStep}
          session={session}
        />
      ) : <div>No step data available</div>,
    },
    {
      key: 'data',
      label: 'Data Collection',
      children: currentStep ? (
        <DataCollectionPanel
          step={currentStep}
          session={session}
          onExecutionComplete={onExecutionComplete}
        />
      ) : <div>No step data available</div>,
    },
  ];

  return (
    <div style={{ height: '100%' }}>
      <Tabs
        items={items}
        defaultActiveKey="instructions"
        size="large"
        style={{ height: '100%' }}
        tabBarStyle={{ margin: 0, padding: '0 16px' }}
      />
    </div>
  );
};

export default TabbedLayout;