import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AddProductSearchScreen } from '../../../src/ui/screens/manager/AddProductSearchScreen';
import * as catalog from '../../../src/api/catalog';

vi.mock('../../../src/api/catalog', () => ({
  listProducts: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(catalog.listProducts).mockResolvedValue([
    {
      id: 'prod-1',
      title: 'Pinar UHT Milk · 1L',
      sku: 'MK-PI-001',
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
});

describe('AddProductSearchScreen', () => {
  it('(a) empty state shows "start typing or scan" copy when no query', async () => {
    render(<MemoryRouter><AddProductSearchScreen /></MemoryRouter>);
    // Wait for products to load
    await waitFor(() => expect(catalog.listProducts).toHaveBeenCalled());
    // Empty state heading should be visible when there is no search query
    expect(screen.getByText(/start typing or scan a barcode/i)).toBeInTheDocument();
  });

  it('(b) typing "pinar" surfaces the catalog match under an "in your catalog" heading', async () => {
    render(<MemoryRouter><AddProductSearchScreen /></MemoryRouter>);
    await waitFor(() => expect(catalog.listProducts).toHaveBeenCalled());

    const input = screen.getByPlaceholderText(/type product name or scan barcode/i);
    fireEvent.change(input, { target: { value: 'pinar' } });

    await waitFor(() => {
      expect(screen.getByText(/in your catalog/i)).toBeInTheDocument();
      expect(screen.getByText('Pinar UHT Milk · 1L')).toBeInTheDocument();
    });
  });

  it('(c) "＋ Create new from scratch" button is always present', async () => {
    render(<MemoryRouter><AddProductSearchScreen /></MemoryRouter>);
    await waitFor(() => expect(catalog.listProducts).toHaveBeenCalled());

    expect(
      screen.getByRole('button', { name: /create new from scratch/i }),
    ).toBeInTheDocument();
  });
});
