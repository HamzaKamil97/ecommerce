import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as client from '../../src/api/client';
import { resetPin } from '../../src/api/staff';

vi.mock('../../src/api/client', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}));

beforeEach(() => vi.clearAllMocks());

describe('staff api client — resetPin', () => {
  it('POSTs to the correct pos-terminal reset-pin endpoint with pin payload', async () => {
    vi.mocked(client.apiPost).mockResolvedValue({ ok: true });

    const result = await resetPin('psc_x', '4242');

    expect(client.apiPost).toHaveBeenCalledWith(
      '/admin/pos-terminal/cashiers/psc_x/reset-pin',
      { pin: '4242' },
    );
    expect(result).toEqual({ ok: true });
  });

  it('URL-encodes the cashier id', async () => {
    vi.mocked(client.apiPost).mockResolvedValue({ ok: true });

    await resetPin('psc x/y', '1234');

    expect(client.apiPost).toHaveBeenCalledWith(
      '/admin/pos-terminal/cashiers/psc%20x%2Fy/reset-pin',
      { pin: '1234' },
    );
  });
});
