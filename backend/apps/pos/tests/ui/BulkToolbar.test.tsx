import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BulkToolbar } from '../../src/ui/components/BulkToolbar';

describe('BulkToolbar', () => {
  it('shows count and action buttons in dark variant', () => {
    const { container } = render(
      <BulkToolbar
        variant="dark"
        count={3}
        onClose={() => {}}
        actions={[{ id: 'price', label: 'Change price', onClick: () => {} }]}
      />,
    );
    expect(container.firstChild).toHaveClass('bulk-toolbar', 'dark');
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('Change price')).toBeTruthy();
  });

  it('paper variant has its own class and triggers actions', () => {
    const onApprove = vi.fn();
    const { container } = render(
      <BulkToolbar
        variant="paper"
        count={2}
        onClose={() => {}}
        actions={[{ id: 'approve', label: 'Approve all 2', onClick: onApprove }]}
      />,
    );
    expect(container.firstChild).toHaveClass('bulk-toolbar', 'paper');
    fireEvent.click(screen.getByText('Approve all 2'));
    expect(onApprove).toHaveBeenCalled();
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    render(<BulkToolbar variant="dark" count={1} onClose={onClose} actions={[]} />);
    fireEvent.click(screen.getByLabelText(/close/i));
    expect(onClose).toHaveBeenCalled();
  });
});
