import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { useCart } from '../../src/state/cart';
import { RegisterScreen } from '../../src/ui/screens/RegisterScreen';

// Mock the hardware barcode listener
vi.mock('../../src/hardware/barcode', () => ({
  startBarcodeListener: ({ onScan }: any) => {
    (window as any).__scan = onScan;
    return () => { delete (window as any).__scan; };
  },
}));

// Mock the catalog lookup
vi.mock('../../src/db/catalog-sync', () => ({
  findByBarcode: async (code: string) => {
    if (code === '111') return { variant_id: 'v1', name: 'Test Item', price_minor: 13500 };
    return null;
  },
  syncCatalog: vi.fn(async () => 0),
  loadCatalogFromDb: vi.fn(async () => [
    { variant_id: 'v1', product_id: 'p1', sku: 'S1', barcode: '1', name: 'Sourdough Loaf',
      price_minor: 2500, currency_code: 'iqd', image_url: null, thumb_emoji: '🍞',
      merch_category_id: 'mc1', category_name: 'Bakery', on_hand: 18, updated_at: 'x' },
  ]),
}));

// Mock Audio so beep.wav doesn't fail in jsdom
beforeEach(() => {
  (global as any).Audio = vi.fn(() => ({ play: vi.fn(() => Promise.resolve()) }));
  useCart.getState().reset();
});

function setViewport(width: number) {
  Object.defineProperty(window, 'innerWidth', { value: width, writable: true, configurable: true });
  window.dispatchEvent(new Event('resize'));
}

describe('RegisterScreen v2', () => {
  it('renders the scan zone hint copy', () => {
    setViewport(1280);
    render(<MemoryRouter><RegisterScreen /></MemoryRouter>);
    expect(screen.getByText(/Scan or tap/i)).toBeInTheDocument();
  });

  it('adds a scanned item to cart and shows it in the list', async () => {
    setViewport(1280);
    render(<MemoryRouter><RegisterScreen /></MemoryRouter>);
    await act(async () => {
      await (window as any).__scan('111');
    });
    expect(useCart.getState().lines.length).toBe(1);
    expect(screen.getByText(/Test Item/)).toBeInTheDocument();
  });

  it('Charge button is disabled when cart is empty', () => {
    setViewport(1280);
    render(<MemoryRouter><RegisterScreen /></MemoryRouter>);
    expect(screen.getByRole('button', { name: /Charge/i })).toBeDisabled();
  });

  it('Charge button shows total in IQD (mono)', () => {
    setViewport(1280);
    useCart.getState().addLineFromScan({ variant_id: 'v1', name: 'X', unit_price_minor: 13500, qty: 1 });
    render(<MemoryRouter><RegisterScreen /></MemoryRouter>);
    expect(screen.getByText(/13,?500/)).toBeInTheDocument();
  });

  it('renders both panes on tablet viewport', async () => {
    setViewport(1024);
    render(<MemoryRouter><RegisterScreen /></MemoryRouter>);
    expect(await screen.findByPlaceholderText(/Search products/i)).toBeInTheDocument();
  });

  it('hides quick-actions pane on phone viewport', () => {
    setViewport(375);
    render(<MemoryRouter><RegisterScreen /></MemoryRouter>);
    expect(screen.queryByPlaceholderText(/Search products/i)).toBeNull();
  });

  it('clicking a catalog tile adds the item to the cart', async () => {
    setViewport(1280);
    render(<MemoryRouter><RegisterScreen /></MemoryRouter>);
    fireEvent.click(await screen.findByText('Sourdough Loaf'));
    expect(useCart.getState().lines.length).toBe(1);
    expect(useCart.getState().lines[0]?.unit_price_minor).toBe(2500);
  });
});
