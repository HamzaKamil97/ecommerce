import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Card } from '../../src/ui/components/Card';

describe('Card', () => {
  it('renders children with card class', () => {
    const { container } = render(<Card>hi</Card>);
    expect(container.firstChild).toHaveClass('card');
  });
  it('adds interactive class when interactive prop', () => {
    const { container } = render(<Card interactive>hi</Card>);
    expect(container.firstChild).toHaveClass('card-interactive');
  });
});
