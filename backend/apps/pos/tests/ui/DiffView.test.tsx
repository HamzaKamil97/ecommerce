import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DiffView } from '../../src/ui/components/DiffView';

describe('DiffView', () => {
  it('renders +/− lines for changed keys', () => {
    render(<DiffView before={{ price_minor: 1500, name: 'A' }} after={{ price_minor: 1650, name: 'A' }} />);
    // changed key appears (text may be split across nodes)
    expect(screen.getAllByText(/price_minor/).length).toBeGreaterThan(0);
    expect(screen.getByText(/1500/)).toBeTruthy();
    expect(screen.getByText(/1650/)).toBeTruthy();
    // unchanged "name" key should not appear
    expect(screen.queryByText(/name:/)).toBeNull();
  });

  it('renders only + lines when before is null (create)', () => {
    render(<DiffView before={null} after={{ id: 'p1' }} />);
    const plusRows = document.querySelectorAll('.diff-line.post');
    expect(plusRows.length).toBeGreaterThan(0);
    const minusRows = document.querySelectorAll('.diff-line.pre');
    expect(minusRows.length).toBe(0);
  });

  it('renders empty placeholder when there are no changes', () => {
    render(<DiffView before={{ a: 1 }} after={{ a: 1 }} />);
    expect(screen.getByText(/no changes/i)).toBeTruthy();
  });
});
