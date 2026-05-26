import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../../src/ui/components/Button';

describe('Button (admin)', () => {
  it('renders and fires click', () => {
    const fn = vi.fn();
    render(<Button onClick={fn}>Save</Button>);
    fireEvent.click(screen.getByText('Save'));
    expect(fn).toHaveBeenCalledOnce();
  });
});
