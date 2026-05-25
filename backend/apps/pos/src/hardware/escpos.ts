const ESC = 0x1B, GS = 0x1D;

const INIT        = new Uint8Array([ESC, 0x40]);
const ALIGN_CENTER = new Uint8Array([ESC, 0x61, 0x01]);
const ALIGN_LEFT   = new Uint8Array([ESC, 0x61, 0x00]);
const BOLD_ON      = new Uint8Array([ESC, 0x45, 0x01]);
const BOLD_OFF     = new Uint8Array([ESC, 0x45, 0x00]);
const feed = (n: number) => new Uint8Array([ESC, 0x64, n]);
const FULL_CUT    = new Uint8Array([GS, 0x56, 0x42, 0x00]);

// Cash drawer kick: ESC p m t1 t2 — m=0 (pin 2), t1=25ms, t2=250ms
export const ESCPOS_DRAWER_KICK = new Uint8Array([ESC, 0x70, 0x00, 0x19, 0xFA]);

export type ReceiptInput = {
  shop_name: string;
  vendor_address: string;
  sale_id: string;
  cashier_name: string;
  currency: string;
  lines: Array<{ name: string; qty: number; unit_price_minor: number; line_total_minor: number }>;
  subtotal_minor: number;
  paid_minor: number;
  change_minor: number;
  printed_at: Date;
};

/** Strip non-printable and non-ASCII chars; ESC/POS defaults to CP437 where UTF-8 garbles. */
function ascii(s: string): Uint8Array {
  const safe = s.replace(/[^\x20-\x7E]/g, '?');
  return new TextEncoder().encode(safe + '\n');
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  return out;
}

function fmtMoney(minor: number): string {
  return String(minor);
}

export function buildReceipt(r: ReceiptInput): Uint8Array {
  const parts: Uint8Array[] = [];
  parts.push(INIT);
  parts.push(ALIGN_CENTER, BOLD_ON, ascii(r.shop_name), BOLD_OFF);
  parts.push(ascii(r.vendor_address));
  parts.push(ALIGN_LEFT, ascii('-'.repeat(32)));
  parts.push(ascii(`Sale: ${r.sale_id}`));
  parts.push(ascii(`Cashier: ${r.cashier_name}`));
  parts.push(ascii(r.printed_at.toISOString()));
  parts.push(ascii('-'.repeat(32)));
  for (const l of r.lines) {
    parts.push(ascii(`${l.name}`));
    parts.push(ascii(`  ${l.qty} x ${fmtMoney(l.unit_price_minor)}    ${fmtMoney(l.line_total_minor)}`));
  }
  parts.push(ascii('-'.repeat(32)));
  parts.push(BOLD_ON, ascii(`TOTAL ${r.currency}  ${fmtMoney(r.subtotal_minor)}`), BOLD_OFF);
  parts.push(ascii(`PAID         ${fmtMoney(r.paid_minor)}`));
  parts.push(ascii(`CHANGE       ${fmtMoney(r.change_minor)}`));
  parts.push(ALIGN_CENTER, ascii('Thank you'));
  parts.push(feed(3));
  parts.push(FULL_CUT);
  return concat(parts);
}
