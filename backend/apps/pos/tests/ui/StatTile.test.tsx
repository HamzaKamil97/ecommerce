import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatTile } from '../../src/ui/components/StatTile';

describe('StatTile', () => {
  it('renders label, num, and trend', () => {
    render(<StatTile label="Today" num="182k" trend="+12%" trendDir="up" />);
    expect(screen.getByText('Today')).toBeTruthy();
    expect(screen.getByText('182k')).toBeTruthy();
    expect(screen.getByText('+12%')).toBeTruthy();
  });
  it('applies bad class on down trend', () => {
    const { container } = render(<StatTile label="Stock" num="3" trend="2 critical" trendDir="down" />);
    expect(container.querySelector('.stat-trend-down')).toBeTruthy();
  });
});
