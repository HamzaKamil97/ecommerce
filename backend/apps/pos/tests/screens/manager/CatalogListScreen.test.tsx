import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { CatalogListScreen } from '../../../src/ui/screens/manager/CatalogListScreen';
import * as catalog from '../../../src/api/catalog';
import { useSpotlight } from '../../../src/state/spotlight';

vi.mock('../../../src/api/catalog', () => ({
  listProducts: vi.fn(),
  listDepartments: vi.fn(),
}));

// Suppress scroll mock — jsdom doesn't implement scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn();

beforeEach(() => {
  vi.mocked(catalog.listDepartments).mockResolvedValue([
    { id: 'dept-1', handle: 'dairy', name: 'Dairy', position: 1, icon_url: null, product_count: 2 },
    { id: 'dept-2', handle: 'bakery', name: 'Bakery', position: 2, icon_url: null, product_count: 1 },
  ]);
  vi.mocked(catalog.listProducts).mockResolvedValue([
    {
      id: 'prod-1',
      title: 'Pinar Milk · 1L',
      sku: 'MK-001',
      barcode: '8690865000123',
      price_minor: 1500,
      currency_code: 'IQD',
      stock_qty: 48,
      merch_category_id: 'dept-1',
      thumb_emoji: '🥛',
    },
    {
      id: 'prod-2',
      title: 'Bakery Bread',
      sku: 'BR-001',
      barcode: null,
      price_minor: 500,
      currency_code: 'IQD',
      stock_qty: 12,
      merch_category_id: 'dept-2',
      thumb_emoji: '🍞',
    },
  ]);
  // Reset spotlight store to prevent cross-test contamination
  useSpotlight.setState({ open: false, query: '' });
});

describe('CatalogListScreen', () => {
  it('renders the rail with departments AND the grid with products', async () => {
    render(<MemoryRouter><CatalogListScreen /></MemoryRouter>);
    await waitFor(() => {
      // Dairy appears in both the rail item and the section header
      const dairyEls = screen.getAllByText('Dairy');
      expect(dairyEls.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Pinar Milk · 1L')).toBeInTheDocument();
      expect(screen.getByText('Bakery Bread')).toBeInTheDocument();
    });
  });

  it('selecting 2+ products opens the bulk toolbar showing the count', async () => {
    render(<MemoryRouter><CatalogListScreen /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('Pinar Milk · 1L')).toBeInTheDocument());

    const checkbox1 = screen.getByRole('checkbox', { name: /select pinar milk/i });
    const checkbox2 = screen.getByRole('checkbox', { name: /select bakery bread/i });

    fireEvent.click(checkbox1);
    fireEvent.click(checkbox2);

    await waitFor(() => {
      const toolbar = screen.getByRole('toolbar', { name: /bulk actions/i });
      expect(toolbar).toBeInTheDocument();
      // The count is shown in a <span class="n">
      const n = toolbar.querySelector('.n');
      expect(n?.textContent).toBe('2');
    });
  });

  it('⌘K opens spotlight dialog', async () => {
    render(<MemoryRouter><CatalogListScreen /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('Pinar Milk · 1L')).toBeInTheDocument());

    fireEvent.keyDown(window, { key: 'k', metaKey: true });

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /spotlight/i })).toBeInTheDocument();
    });
  });
});
