import { render } from '@testing-library/react';
import { ToastNotification } from './ToastNotification';

describe('ToastNotification', () => {
  it('renders successfully', () => {
    render(<ToastNotification />);
  });
});
