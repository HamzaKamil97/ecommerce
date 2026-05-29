import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as client from '../../src/api/client';
import { listDepartments } from '../../src/api/catalog';

vi.mock('../../src/api/client', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}));

beforeEach(() => vi.clearAllMocks());

describe('catalog api client — listDepartments', () => {
  it('GETs the tenant merch-categories route and maps to Department[]', async () => {
    vi.mocked(client.apiGet).mockResolvedValue({
      merch_categories: [
        { id: 'mc_1', tenant_id: 'v_test', handle: 'dairy', name: 'Dairy', position: 0, icon_url: '🥛' },
      ],
    });
    const out = await listDepartments('v_test');
    expect(client.apiGet).toHaveBeenCalledWith('/admin/tenants/v_test/merch-categories');
    expect(out).toEqual([
      { id: 'mc_1', handle: 'dairy', name: 'Dairy', position: 0, icon_url: '🥛' },
    ]);
  });

  it('returns [] on empty payload', async () => {
    vi.mocked(client.apiGet).mockResolvedValue({ merch_categories: [] });
    expect(await listDepartments('v_test')).toEqual([]);
  });
});
