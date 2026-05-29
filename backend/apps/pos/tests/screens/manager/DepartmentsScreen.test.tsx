import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { DepartmentsScreen } from '../../../src/ui/screens/manager/DepartmentsScreen';
import * as deptApi from '../../../src/api/departments';

vi.mock('../../../src/api/departments', () => ({
  listDepartments: vi.fn(),
  updateDepartment: vi.fn(),
  reorderDepartments: vi.fn(),
  createDepartment: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(deptApi.listDepartments).mockResolvedValue([
    {
      id: 'd1',
      tenant_id: 'tenant-1',
      handle: 'dairy',
      name: 'Dairy',
      position: 1,
      icon_url: null,
      product_count: 42,
    },
    {
      id: 'd2',
      tenant_id: 'tenant-1',
      handle: 'bakery',
      name: 'Bakery',
      position: 2,
      icon_url: null,
      product_count: 28,
    },
  ]);
  vi.mocked(deptApi.updateDepartment).mockResolvedValue({ ok: true });
  vi.mocked(deptApi.reorderDepartments).mockResolvedValue({ updated: 2 });
  vi.mocked(deptApi.createDepartment).mockResolvedValue({
    id: 'd3',
    tenant_id: 'tenant-1',
    handle: 'new-dept',
    name: 'New Dept',
    position: 3,
    icon_url: null,
    product_count: 0,
  });
});

describe('DepartmentsScreen', () => {
  it('renders departments with names and product counts', async () => {
    render(
      <MemoryRouter>
        <DepartmentsScreen />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText('Dairy')).toBeInTheDocument();
      expect(screen.getByText('Bakery')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('28')).toBeInTheDocument();
    });
  });

  it('inline edit reveals input and saves on Enter via updateDepartment', async () => {
    render(
      <MemoryRouter>
        <DepartmentsScreen />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText('Dairy')).toBeInTheDocument());

    // Click the edit button for the first department (Dairy)
    const editButtons = screen.getAllByLabelText(/^edit/i);
    fireEvent.click(editButtons[0]!);

    // Inline input should appear with current value
    const input = screen.getByDisplayValue('Dairy');
    expect(input).toBeInTheDocument();

    // Change the value
    fireEvent.change(input, { target: { value: 'Dairy & Yoghurt' } });

    // Press Enter to save
    fireEvent.keyDown(input, { key: 'Enter' });

    // updateDepartment should be called with the new name
    await waitFor(() => {
      expect(deptApi.updateDepartment).toHaveBeenCalledWith(
        'd1',
        expect.objectContaining({ name: 'Dairy & Yoghurt' }),
      );
    });
  });
});
