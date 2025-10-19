import React from 'react';
import { WorkInstructionForm } from '@/components/WorkInstructions/WorkInstructionForm';

/**
 * Work Instruction Create Page
 *
 * Route: /work-instructions/create
 *
 * Form for creating a new work instruction.
 * Uses the existing WorkInstructionForm component from Sprint 2 in 'create' mode.
 */
const WorkInstructionCreatePage: React.FC = () => {
  return <WorkInstructionForm mode="create" />;
};

export default WorkInstructionCreatePage;
