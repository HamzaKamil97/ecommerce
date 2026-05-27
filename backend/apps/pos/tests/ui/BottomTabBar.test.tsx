import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { BottomTabBar } from '../../src/ui/components/BottomTabBar';

const ITEMS = [
  { key: 'register', label: 'Register', icon: '🛒', href: '/' },
  { key: 'orders', label: 'Orders', icon: '📦', href: '/orders', badge: 2 },
  { key: 'catalog', label: 'Catalog', icon: '🗂', href: '/manager/catalog' },
  { key: 'more', label: 'More', icon: '⋯', href: '/more' },
];

describe('BottomTabBar', () => {
  it('renders all tabs with labels', () => {
    render(<MemoryRouter><BottomTabBar items={ITEMS} active="register" /></MemoryRouter>);
    expect(screen.getByText(/Register/)).toBeInTheDocument();
    expect(screen.getByText(/Orders/)).toBeInTheDocument();
    expect(screen.getByText(/Catalog/)).toBeInTheDocument();
    expect(screen.getByText(/More/)).toBeInTheDocument();
  });

  it('badges show on tabs with badge > 0', () => {
    render(<MemoryRouter><BottomTabBar items={ITEMS} active="register" /></MemoryRouter>);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('active tab has active class or distinct styling', () => {
    const { container } = render(<MemoryRouter><BottomTabBar items={ITEMS} active="orders" /></MemoryRouter>);
    const active = container.querySelector('.tab-item.active');
    expect(active).not.toBeNull();
    expect(active?.textContent).toMatch(/Orders/);
  });
});
