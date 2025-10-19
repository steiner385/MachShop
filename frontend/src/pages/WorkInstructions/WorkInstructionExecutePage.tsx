import React from 'react';
import { TabletExecutionView } from '@/components/WorkInstructions/TabletExecutionView';

/**
 * Work Instruction Execute Page
 *
 * Route: /work-instructions/:id/execute
 *
 * Full-screen tablet-optimized interface for executing work instructions step-by-step.
 * Uses the existing TabletExecutionView component from Sprint 2.
 *
 * Features:
 * - Full-screen execution mode
 * - Step-by-step navigation
 * - Progress tracking
 * - Media display (images, videos, attachments)
 * - Step completion tracking
 */
const WorkInstructionExecutePage: React.FC = () => {
  return <TabletExecutionView />;
};

export default WorkInstructionExecutePage;
