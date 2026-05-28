import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CapabilityPill } from '../../src/ui/components/CapabilityPill';

describe('CapabilityPill', () => {
  it.each([
    ['allow', 'Allowed'],
    ['pin', 'PIN required'],
    ['deny', 'Denied'],
    ['override-on', '★ Override ON'],
    ['override-off', '⛔ Override OFF'],
  ] as const)('renders the %s variant with text "%s"', (variant, expected) => {
    render(<CapabilityPill variant={variant}>{expected}</CapabilityPill>);
    expect(screen.getByText(expected)).toBeTruthy();
  });

  it('applies the variant CSS class', () => {
    const { container } = render(<CapabilityPill variant="override-on">★ ON</CapabilityPill>);
    expect(container.firstChild).toHaveClass('cap-pill', 'override-on');
  });
});
