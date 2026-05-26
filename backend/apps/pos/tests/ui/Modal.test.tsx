import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from '../../src/ui/components/Modal';

describe('Modal', () => {
  it('renders when open', () => {
    render(<Modal open onClose={() => {}} title="Confirm"><p>body</p></Modal>);
    expect(screen.getByText('Confirm')).toBeTruthy();
    expect(screen.getByText('body')).toBeTruthy();
  });
  it('does not render when closed', () => {
    render(<Modal open={false} onClose={() => {}} title="Confirm"><p>body</p></Modal>);
    expect(screen.queryByText('Confirm')).toBeNull();
  });
  it('calls onClose when backdrop clicked', () => {
    const fn = vi.fn();
    render(<Modal open onClose={fn} title="x"><p>body</p></Modal>);
    fireEvent.click(document.querySelector('.modal-backdrop')!);
    expect(fn).toHaveBeenCalled();
  });
});
