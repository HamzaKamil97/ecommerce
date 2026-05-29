import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as client from '../../src/api/client';
import { listStaff } from '../../src/api/staff';

vi.mock('../../src/api/client', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}));

beforeEach(() => vi.clearAllMocks());

describe('staff api client — listStaff', () => {
  it('GETs the pos-terminal cashiers route with vendor_id and maps cashier→StaffRow', async () => {
    vi.mocked(client.apiGet).mockResolvedValue({
      cashiers: [
        { id: 'c_1', vendor_id: 'v_test', name: 'QA Manager', role: 'manager', active: true, pin_hash_prefix: 'abcd1234' },
      ],
    });
    const out = await listStaff('v_test');
    expect(client.apiGet).toHaveBeenCalledWith('/admin/pos-terminal/cashiers?vendor_id=v_test');
    expect(out).toEqual([
      {
        id: 'c_1',
        vendor_id: 'v_test',
        name: 'QA Manager',
        role: 'manager',
        permission_overrides: {},
        last_active_at: null,
      },
    ]);
  });

  it('defaults permission_overrides to {} so PinResetScreen.resolveLabel never throws', async () => {
    vi.mocked(client.apiGet).mockResolvedValue({
      cashiers: [{ id: 'c_2', vendor_id: 'v_test', name: 'Hala', role: 'cashier', active: true, pin_hash_prefix: 'ef00' }],
    });
    const rows = await listStaff('v_test');
    const row = rows[0]!;
    expect(row.permission_overrides).toEqual({});
    expect(row.permission_overrides['pos.refund_or_void']).toBeUndefined();
  });

  it('returns [] on empty payload', async () => {
    vi.mocked(client.apiGet).mockResolvedValue({ cashiers: [] });
    expect(await listStaff('v_test')).toEqual([]);
  });
});
