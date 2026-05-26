import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Sheet } from '../../src/ui/components/Sheet';

describe('Sheet (admin)', () => {
  it('renders when open', () => {
    render(<Sheet open onClose={() => {}} title="Pick"><div>body</div></Sheet>);
    expect(screen.getByText('Pick')).toBeTruthy();
  });
});
