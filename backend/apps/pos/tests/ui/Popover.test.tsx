import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Popover } from '../../src/ui/components/Popover';

describe('Popover', () => {
  it('renders content when open', () => {
    render(<Popover open onClose={() => {}}><div>menu</div></Popover>);
    expect(screen.getByText('menu')).toBeTruthy();
  });
  it('returns null when closed', () => {
    const { container } = render(<Popover open={false} onClose={() => {}}><div>x</div></Popover>);
    expect(container.querySelector('.popover')).toBeNull();
  });
  it('closes when clicking outside', () => {
    const fn = vi.fn();
    render(
      <div>
        <Popover open onClose={fn}><div>menu</div></Popover>
        <button>outside</button>
      </div>
    );
    fireEvent.mouseDown(screen.getByText('outside'));
    expect(fn).toHaveBeenCalled();
  });
});
