import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AddProductScreen } from '../../../src/ui/screens/manager/AddProductScreen';
import * as catalog from '../../../src/api/catalog';

vi.mock('../../../src/api/catalog', () => ({
  listDepartments: vi.fn(),
  createProduct: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(catalog.listDepartments).mockResolvedValue([
    { id: 'd_dairy', handle: 'dairy', name: 'Dairy', position: 0 },
  ]);
  vi.mocked(catalog.createProduct).mockResolvedValue({ id: 'p_new' });
});

function renderAt(path = '/manager/catalog/new') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/manager/catalog/new" element={<AddProductScreen />} />
        <Route path="/manager/catalog" element={<div>Catalog</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AddProductScreen', () => {
  it('(a) renders required Title + Price fields; accordion body (cost price) is NOT visible by default', async () => {
    renderAt();

    // Wait for departments to load
    await waitFor(() => expect(catalog.listDepartments).toHaveBeenCalled());

    // Required fields are present and visible
    expect(screen.getByLabelText('Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toBeVisible();

    // Required price field — exact label match to avoid collision with "Cost price"
    expect(screen.getByLabelText('Price')).toBeInTheDocument();
    expect(screen.getByLabelText('Price')).toBeVisible();

    // Cost price is in the DOM but NOT visible (accordion collapsed)
    const costPriceInput = screen.queryByLabelText('Cost price');
    expect(costPriceInput).not.toBeNull();
    expect(costPriceInput).not.toBeVisible();
  });

  it('(b) clicking "More details" button reveals cost price AND Best-before field', async () => {
    renderAt();
    await waitFor(() => expect(catalog.listDepartments).toHaveBeenCalled());

    const toggleBtn = screen.getByRole('button', { name: /more details/i });
    expect(toggleBtn).toBeInTheDocument();

    // Before clicking — not visible
    expect(screen.queryByLabelText('Cost price')).not.toBeVisible();
    expect(screen.queryByLabelText('Best-before date')).not.toBeVisible();

    // Click to expand
    fireEvent.click(toggleBtn);

    // After clicking — both visible
    expect(screen.getByLabelText('Cost price')).toBeVisible();
    expect(screen.getByLabelText('Best-before date')).toBeVisible();
  });

  it('(c) filling title+price and saving calls createProduct with correct payload', async () => {
    renderAt('/manager/catalog/new?title=Pinar%20Milk');
    await waitFor(() => expect(catalog.listDepartments).toHaveBeenCalled());

    // Title should be pre-filled from query param
    const titleInput = screen.getByLabelText('Title');
    expect((titleInput as HTMLInputElement).value).toContain('Pinar');

    // Set price
    const priceInput = screen.getByLabelText('Price');
    fireEvent.change(priceInput, { target: { value: '1500' } });

    // Click save
    const saveBtn = screen.getByRole('button', { name: /✓ save product/i });
    fireEvent.click(saveBtn);

    await waitFor(() =>
      expect(catalog.createProduct).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('Pinar'),
          price_minor: 1500,
        }),
      ),
    );
  });
});
