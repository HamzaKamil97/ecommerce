import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Input } from '../../src/ui/components/Input';

describe('Input', () => {
  it('renders with label', () => {
    render(<Input label="Title" name="title" />);
    expect(screen.getByLabelText('Title')).toBeTruthy();
  });
  it('renders help text', () => {
    render(<Input label="Email" help="We never share" />);
    expect(screen.getByText('We never share')).toBeTruthy();
  });
  it('renders error in error state', () => {
    render(<Input label="Price" error="Must be positive" />);
    expect(screen.getByText('Must be positive')).toBeTruthy();
    expect(document.querySelector('.inp-error')).toBeTruthy();
  });
});
