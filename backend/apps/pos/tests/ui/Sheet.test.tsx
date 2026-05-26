import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Sheet } from '../../src/ui/components/Sheet';

describe('Sheet', () => {
  it('renders when open', () => {
    render(<Sheet open onClose={() => {}} title="Pick"><p>opts</p></Sheet>);
    expect(screen.getByText('Pick')).toBeTruthy();
  });
  it('returns null when closed', () => {
    const { container } = render(<Sheet open={false} onClose={() => {}} title="x"><p>y</p></Sheet>);
    expect(container.querySelector('.sheet')).toBeNull();
  });
  it('closes on backdrop tap', () => {
    const fn = vi.fn();
    render(<Sheet open onClose={fn} title="x"><p>y</p></Sheet>);
    fireEvent.click(document.querySelector('.sheet-backdrop')!);
    expect(fn).toHaveBeenCalled();
  });
});
