import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AddProductScreen } from '../src/ui/screens/manager/AddProductScreen';
import { resetDbForTests } from '../src/db/dexie';

vi.mock('../src/api/pos', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    fetchCategories: vi.fn(),
    fetchSchema: vi.fn(),
    createProduct: vi.fn(),
    barcodeLookup: vi.fn(),
    classifyName: vi.fn(),
  };
});

import * as posApi from '../src/api/pos';

describe('AddProductScreen', () => {
  beforeEach(async () => {
    await resetDbForTests();
    vi.clearAllMocks();
  });

  it('manual entry: pick grocery, fill name+price, save calls createProduct', async () => {
    vi.mocked(posApi.fetchCategories).mockResolvedValue([
      { id: 'csc1', handle: 'grocery',  name: 'Grocery', icon: '🛒', position: 1 },
      { id: 'csc2', handle: 'other',    name: 'Other',   icon: '📦', position: 99 },
    ]);
    vi.mocked(posApi.fetchSchema).mockResolvedValue({
      category_handle: 'grocery',
      fields: [
        { key: 'weight_grams', label: 'Weight (g)', kind: 'number' },
        { key: 'brand',        label: 'Brand',      kind: 'text' },
      ],
    });
    vi.mocked(posApi.createProduct).mockResolvedValue({
      product: { id: 'prod_x', variants: [{ id: 'var_x' }] },
    } as any);

    render(<MemoryRouter><AddProductScreen /></MemoryRouter>);
    await waitFor(() => screen.getByText(/Grocery/));
    fireEvent.click(screen.getByText(/Grocery/));
    await waitFor(() => screen.getByLabelText(/Weight \(g\)/));
    fireEvent.change(screen.getByLabelText(/^Title/), { target: { value: 'Bread' } });
    fireEvent.change(screen.getByLabelText(/^Price/), { target: { value: '1000' } });
    fireEvent.change(screen.getByLabelText(/Weight \(g\)/), { target: { value: '500' } });
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(posApi.createProduct).toHaveBeenCalled());
    expect((posApi.createProduct as any).mock.calls[0][0]).toMatchObject({
      title: 'Bread',
      price_minor: 1000,
      category_handle: 'grocery',
      schema_fields: { weight_grams: 500 },
    });
  });
});
