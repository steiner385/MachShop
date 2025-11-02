import { render } from '@testing-library/react';
import { SkeletonLoader } from './SkeletonLoader';

describe('SkeletonLoader', () => {
  it('renders successfully', () => {
    render(<SkeletonLoader />);
  });
});
