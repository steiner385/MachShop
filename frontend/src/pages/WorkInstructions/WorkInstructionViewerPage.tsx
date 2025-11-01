import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { message, Spin, Empty, Button, Space } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { WorkInstructionViewer } from '@/components/WorkInstructions/WorkInstructionViewer';
import { workInstructionApi } from '@/api/workInstructions';
import type { WorkInstruction } from '@/api/workInstructions';

/**
 * Work Instruction Viewer Page (Phase 1)
 *
 * Page-level component for displaying a work instruction in read-only viewer mode
 * with full-screen optimization for shop floor displays and tablets.
 *
 * Routes:
 * - /work-instructions/:id/view
 * - /work-instructions/:id/viewer
 *
 * Issue #45: Work Instruction Viewer with Data Collection - Shop Floor UI
 */
export const WorkInstructionViewerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [workInstruction, setWorkInstruction] = useState<WorkInstruction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load work instruction on mount
  useEffect(() => {
    if (!id) {
      setError('No work instruction ID provided');
      setIsLoading(false);
      return;
    }

    const loadWorkInstruction = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const instruction = await workInstructionApi.getWorkInstructionById(id);

        if (!instruction) {
          setError('Work instruction not found');
          setWorkInstruction(null);
        } else {
          setWorkInstruction(instruction);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load work instruction';
        setError(errorMessage);
        message.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkInstruction();
  }, [id]);

  const handleStepChange = (stepNumber: number) => {
    // Hook for future analytics, logging, or data collection tracking
    console.log(`User navigated to step ${stepNumber}`);
  };

  const handleBack = () => {
    navigate('/work-instructions');
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Spin size="large" tip="Loading work instruction..." />
      </div>
    );
  }

  if (error && !workInstruction) {
    return (
      <div style={{ padding: '24px' }}>
        <Empty description={error} />
        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <Button
            type="primary"
            onClick={handleBack}
            icon={<ArrowLeftOutlined />}
          >
            Back to Work Instructions
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Back Navigation */}
      <div style={{ padding: '8px 24px', backgroundColor: '#fff', borderBottom: '1px solid #f0f0f0' }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={handleBack}
        >
          Back
        </Button>
      </div>

      {/* Viewer Component */}
      {workInstruction ? (
        <WorkInstructionViewer
          workInstruction={workInstruction}
          isLoading={isLoading}
          onStepChange={handleStepChange}
        />
      ) : (
        <Empty description="No work instruction available" style={{ marginTop: '50px' }} />
      )}
    </div>
  );
};

export default WorkInstructionViewerPage;
