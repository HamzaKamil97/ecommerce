import { describe, it, expect } from '@jest/globals';
import { resolveCapability, ROLE_DEFAULTS } from '../capabilities';

describe('capabilities', () => {
  it('owner gets every capability by default', () => {
    expect(resolveCapability('owner', 'pos.ring_sales')).toBe(true);
    expect(resolveCapability('owner', 'staff.manage')).toBe(true);
    expect(resolveCapability('owner', 'shop.receipt_designer')).toBe(true);
  });

  it('cashier needs PIN for refunds', () => {
    expect(resolveCapability('cashier', 'pos.refund_or_void')).toBe('pin');
    expect(resolveCapability('cashier', 'pos.return_process')).toBe('pin');
    expect(resolveCapability('cashier', 'pos.ring_sales')).toBe(true);
  });

  it('cashier denied staff management', () => {
    expect(resolveCapability('cashier', 'staff.manage')).toBe(false);
  });

  it('per-user override wins over role default', () => {
    expect(resolveCapability('manager', 'pos.refund_or_void', { 'pos.refund_or_void': false })).toBe(false);
    expect(resolveCapability('cashier', 'reports.export', { 'reports.export': true })).toBe(true);
  });

  it('picker has narrow grant', () => {
    expect(resolveCapability('picker', 'orders.pick_workflow')).toBe(true);
    expect(resolveCapability('picker', 'pos.ring_sales')).toBe(false);
    expect(resolveCapability('picker', 'reports.view')).toBe(false);
  });
});
