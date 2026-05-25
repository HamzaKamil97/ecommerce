import { describe, it, expect } from 'vitest';
import { buildReceipt, ESCPOS_DRAWER_KICK } from '../src/hardware/escpos';

describe('ESC/POS byte builder', () => {
  it('starts with ESC @ (initialize)', () => {
    const bytes = buildReceipt({
      shop_name: 'Test', vendor_address: 'X',
      sale_id: 'pos_1', cashier_name: 'A', currency: 'IQD',
      lines: [{ name: 'Bread', qty: 1, unit_price_minor: 1000, line_total_minor: 1000 }],
      subtotal_minor: 1000, paid_minor: 1000, change_minor: 0,
      printed_at: new Date('2026-05-26T10:00:00Z'),
    });
    expect(bytes[0]).toBe(0x1B);
    expect(bytes[1]).toBe(0x40);
  });

  it('ends with a paper-cut sequence', () => {
    const bytes = buildReceipt({
      shop_name: 'Test', vendor_address: 'X', sale_id: 'pos_1', cashier_name: 'A',
      currency: 'IQD', lines: [{ name: 'X', qty: 1, unit_price_minor: 100, line_total_minor: 100 }],
      subtotal_minor: 100, paid_minor: 100, change_minor: 0, printed_at: new Date(),
    });
    const last4 = Array.from(bytes.slice(bytes.length - 4));
    expect(last4).toEqual([0x1D, 0x56, 0x42, 0x00]);
  });

  it('drawer-kick is exactly 5 bytes: ESC p 0 25 250', () => {
    expect(Array.from(ESCPOS_DRAWER_KICK)).toEqual([0x1B, 0x70, 0x00, 0x19, 0xFA]);
  });

  it('includes each line name + qty + total in ASCII', () => {
    const bytes = buildReceipt({
      shop_name: 'Hanoot Shop', vendor_address: 'Baghdad', sale_id: 'pos_xyz',
      cashier_name: 'Ahmad', currency: 'IQD',
      lines: [
        { name: 'Bread', qty: 2, unit_price_minor: 500, line_total_minor: 1000 },
        { name: 'Milk',  qty: 1, unit_price_minor: 2500, line_total_minor: 2500 },
      ],
      subtotal_minor: 3500, paid_minor: 5000, change_minor: 1500,
      printed_at: new Date('2026-05-26T10:00:00Z'),
    });
    const text = new TextDecoder('utf-8').decode(bytes);
    expect(text).toContain('Bread');
    expect(text).toContain('Milk');
    expect(text).toContain('3500');
    expect(text).toContain('Ahmad');
    expect(text).toContain('pos_xyz');
  });

  it('strips non-printable / non-ASCII chars from input (defensive against printer corruption)', () => {
    const bytes = buildReceipt({
      shop_name: 'Café Hanoot', // non-ASCII
      vendor_address: 'Karrada',
      sale_id: 'pos_1', cashier_name: 'A', currency: 'IQD',
      lines: [{ name: 'سندوتش', qty: 1, unit_price_minor: 1000, line_total_minor: 1000 }], // Arabic
      subtotal_minor: 1000, paid_minor: 1000, change_minor: 0,
      printed_at: new Date('2026-05-26T10:00:00Z'),
    });
    const text = new TextDecoder('utf-8').decode(bytes);
    // Non-ASCII replaced with '?'; the receipt still prints (doesn't throw or corrupt the printer)
    expect(text).toContain('Caf?');
    expect(text).toMatch(/\?+/); // the Arabic line name becomes ????
    expect(text).toContain('1000');
  });
});
