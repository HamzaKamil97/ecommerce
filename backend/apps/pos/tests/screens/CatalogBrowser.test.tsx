import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CatalogBrowser } from '../../src/ui/screens/register/CatalogBrowser';
import type { CatalogRow } from '../../src/db/dexie';
import * as catalogSync from '../../src/db/catalog-sync';

const ROWS: CatalogRow[] = [
  { variant_id: 'v1', product_id: 'p1', sku: 'S1', barcode: '1', name: 'Sourdough Loaf',
    price_minor: 2500, currency_code: 'iqd', image_url: null, thumb_emoji: '🍞',
    merch_category_id: 'mc1', category_name: 'Bakery', on_hand: 18, updated_at: 'x' },
  { variant_id: 'v2', product_id: 'p2', sku: 'S2', barcode: '2', name: 'Milk 1L',
    price_minor: 2750, currency_code: 'iqd', image_url: null, thumb_emoji: '🥛',
    merch_category_id: 'mc2', category_name: 'Dairy', on_hand: 42, updated_at: 'x' },
];

vi.mock('../../src/db/catalog-sync', () => ({
  syncCatalog: vi.fn(),
  loadCatalogFromDb: vi.fn(),
}));

beforeEach(() => {
  (catalogSync.syncCatalog as any).mockResolvedValue(2);
  (catalogSync.loadCatalogFromDb as any).mockResolvedValue(ROWS);
});

describe('CatalogBrowser', () => {
  it('renders product tiles from the real catalog with correct price', async () => {
    render(<CatalogBrowser vendorId="v_test" onPick={vi.fn()} />);
    expect(await screen.findByText('Sourdough Loaf')).toBeTruthy();
    expect(screen.getByText('2,500 IQD')).toBeTruthy();
    expect(screen.getByText('Milk 1L')).toBeTruthy();
  });

  it('filters by search query', async () => {
    render(<CatalogBrowser vendorId="v_test" onPick={vi.fn()} />);
    await screen.findByText('Sourdough Loaf');
    fireEvent.change(screen.getByPlaceholderText(/Search/i), { target: { value: 'milk' } });
    expect(screen.queryByText('Sourdough Loaf')).toBeNull();
    expect(screen.getByText('Milk 1L')).toBeTruthy();
  });

  it('filters by department chip', async () => {
    render(<CatalogBrowser vendorId="v_test" onPick={vi.fn()} />);
    await screen.findByText('Sourdough Loaf');
    fireEvent.click(screen.getByRole('button', { name: 'Bakery' }));
    expect(screen.getByText('Sourdough Loaf')).toBeTruthy();
    expect(screen.queryByText('Milk 1L')).toBeNull();
  });

  it('calls onPick with the catalog row when a tile is tapped', async () => {
    const onPick = vi.fn();
    render(<CatalogBrowser vendorId="v_test" onPick={onPick} />);
    fireEvent.click(await screen.findByText('Sourdough Loaf'));
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ variant_id: 'v1', price_minor: 2500 }));
  });

  it('shows an empty state when the catalog is empty', async () => {
    (catalogSync.loadCatalogFromDb as any).mockResolvedValue([]);
    render(<CatalogBrowser vendorId="v_test" onPick={vi.fn()} />);
    expect(await screen.findByText(/No products yet/i)).toBeTruthy();
  });
});
