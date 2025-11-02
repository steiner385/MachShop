import { render } from '@testing-library/react';
import { LoadingSpinner } from './LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders successfully', () => {
    render(<LoadingSpinner />);
  });
});
