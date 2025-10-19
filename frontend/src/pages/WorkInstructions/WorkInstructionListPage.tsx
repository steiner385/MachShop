import React from 'react';
import { WorkInstructionList } from '@/components/WorkInstructions/WorkInstructionList';

/**
 * Work Instruction List Page
 *
 * Route: /work-instructions
 *
 * Displays paginated list of all work instructions with search/filter capabilities.
 * Uses the existing WorkInstructionList component from Sprint 2.
 */
const WorkInstructionListPage: React.FC = () => {
  return <WorkInstructionList />;
};

export default WorkInstructionListPage;
