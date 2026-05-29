import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as client from '../../src/api/client';
import {
  listDepartments,
  createDepartment,
  updateDepartment,
  reorderDepartments,
} from '../../src/api/departments';

vi.mock('../../src/api/client', () => ({
  api: vi.fn(),
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPatch: vi.fn(),
  apiDelete: vi.fn(),
}));

const mc = {
  id: 'mc_1', tenant_id: 'v_test', handle: 'dairy', name: 'Dairy',
  position: 2, icon_url: '🥛',
};

beforeEach(() => vi.clearAllMocks());

describe('departments api client', () => {
  it('listDepartments GETs the tenant merch-categories route and maps the rows', async () => {
    vi.mocked(client.apiGet).mockResolvedValue({ merch_categories: [mc] });
    const out = await listDepartments('v_test');
    expect(client.apiGet).toHaveBeenCalledWith('/admin/tenants/v_test/merch-categories');
    expect(out).toEqual([
      { id: 'mc_1', tenant_id: 'v_test', handle: 'dairy', name: 'Dairy', position: 2, icon_url: '🥛' },
    ]);
  });

  it('listDepartments returns [] when the payload is empty', async () => {
    vi.mocked(client.apiGet).mockResolvedValue({ merch_categories: [] });
    expect(await listDepartments('v_test')).toEqual([]);
  });

  it('createDepartment POSTs name/handle/icon to the tenant route and unwraps merch_category', async () => {
    vi.mocked(client.apiPost).mockResolvedValue({ merch_category: mc });
    const out = await createDepartment({ tenant_id: 'v_test', name: 'Dairy', handle: 'dairy' });
    expect(client.apiPost).toHaveBeenCalledWith('/admin/tenants/v_test/merch-categories', {
      name: 'Dairy', handle: 'dairy', icon_url: undefined,
    });
    expect(out).toEqual({
      id: 'mc_1', tenant_id: 'v_test', handle: 'dairy', name: 'Dairy', position: 2, icon_url: '🥛',
    });
  });

  it('updateDepartment PATCHes the tenant+id route and unwraps merch_category', async () => {
    vi.mocked(client.apiPatch).mockResolvedValue({ merch_category: { ...mc, name: 'Dairy & Eggs' } });
    const out = await updateDepartment('v_test', 'mc_1', { name: 'Dairy & Eggs' });
    expect(client.apiPatch).toHaveBeenCalledWith(
      '/admin/tenants/v_test/merch-categories/mc_1',
      { name: 'Dairy & Eggs' },
    );
    expect(out.name).toBe('Dairy & Eggs');
  });

  it('reorderDepartments PUTs the existing reorder route unchanged', async () => {
    vi.mocked(client.api).mockResolvedValue({ updated: 2 });
    const out = await reorderDepartments('v_test', [{ id: 'a', position: 0 }, { id: 'b', position: 1 }]);
    expect(client.api).toHaveBeenCalledWith('/admin/departments/reorder', {
      method: 'PUT',
      body: JSON.stringify({ tenant_id: 'v_test', order: [{ id: 'a', position: 0 }, { id: 'b', position: 1 }] }),
    });
    expect(out).toEqual({ updated: 2 });
  });
});
