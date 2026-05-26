import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '../../src/ui/components/Badge';

describe('Badge', () => {
  it('renders label', () => {
    render(<Badge>NEW</Badge>);
    expect(screen.getByText('NEW')).toBeTruthy();
  });

  it.each(['ok', 'warn', 'crit', 'info', 'quiet'] as const)('applies %s variant class', (v) => {
    const { container } = render(<Badge variant={v}>x</Badge>);
    expect(container.firstChild).toHaveClass(`badge-${v}`);
  });
});
