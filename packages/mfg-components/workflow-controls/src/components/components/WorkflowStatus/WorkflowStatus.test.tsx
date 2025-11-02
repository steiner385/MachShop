import { render } from '@testing-library/react';
import { WorkflowStatus } from './WorkflowStatus';

describe('WorkflowStatus', () => {
  it('renders successfully', () => {
    render(<WorkflowStatus />);
  });
});
