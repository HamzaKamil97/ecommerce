import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToastProvider, useToast } from '../../src/ui/components/ToastProvider';

function Probe() {
  const toast = useToast();
  return <button onClick={() => toast.success('Saved')}>fire</button>;
}

describe('Toast', () => {
  it('shows toast on success() and dismisses on close click', () => {
    render(<ToastProvider><Probe /></ToastProvider>);
    fireEvent.click(screen.getByText('fire'));
    expect(screen.getByText('Saved')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('dismiss'));
    expect(screen.queryByText('Saved')).toBeNull();
  });
});
