import { render } from '@testing-library/react';
import { TaskList } from './TaskList';

describe('TaskList', () => {
  it('renders successfully', () => {
    render(<TaskList />);
  });
});
