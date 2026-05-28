import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Spotlight } from '../../src/ui/components/Spotlight';

const sampleResults = [
  { group: 'Products', items: [{ id: 'p1', label: 'Pinar Milk', meta: 'Dairy · 1,500 IQD' }] },
  { group: 'Actions',  items: [{ id: 'a1', label: 'Open CSV Import', shortcut: '⌘I' }] },
];

describe('Spotlight', () => {
  it('renders results grouped by section', () => {
    render(<Spotlight open query="" onQueryChange={() => {}} onClose={() => {}} onSelect={() => {}} results={sampleResults} />);
    expect(screen.getByText('Products')).toBeTruthy();
    expect(screen.getByText('Pinar Milk')).toBeTruthy();
    expect(screen.getByText('Open CSV Import')).toBeTruthy();
  });

  it('arrow-down moves the keyboard cursor; enter calls onSelect with the active item', () => {
    const onSelect = vi.fn();
    render(<Spotlight open query="" onQueryChange={() => {}} onClose={() => {}} onSelect={onSelect} results={sampleResults} />);
    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'a1' }));
  });

  it('escape calls onClose', () => {
    const onClose = vi.fn();
    render(<Spotlight open query="" onQueryChange={() => {}} onClose={onClose} onSelect={() => {}} results={[]} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('returns null when closed', () => {
    const { container } = render(
      <Spotlight open={false} query="" onQueryChange={() => {}} onClose={() => {}} onSelect={() => {}} results={sampleResults} />
    );
    expect(container.firstChild).toBeNull();
  });
});
