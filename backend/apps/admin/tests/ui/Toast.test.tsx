import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToastProvider, useToast } from '../../src/ui/components/ToastProvider';

function Probe() {
  const t = useToast();
  return <button onClick={() => t.success('OK')}>fire</button>;
}

describe('Toast (admin)', () => {
  it('shows toast on success()', () => {
    render(<ToastProvider><Probe /></ToastProvider>);
    fireEvent.click(screen.getByText('fire'));
    expect(screen.getByText('OK')).toBeTruthy();
  });
});
