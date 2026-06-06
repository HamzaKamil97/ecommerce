import { MedusaService } from '@medusajs/framework/utils';
import { randomBytes } from 'crypto';
import { ScanCart } from './models/scan-cart.model';
import { ScanCartLine } from './models/scan-cart-line.model';
import { AddLineInput, ScanCartStatus } from './types';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const TTL_MS = 15 * 60 * 1000;

class Base extends MedusaService({ ScanCart, ScanCartLine }) {}

export class ScanCartService extends Base {
  private genCode(): string {
    const b = randomBytes(6);
    let out = '';
    for (let i = 0; i < 6; i++) out += CODE_ALPHABET[b[i] % CODE_ALPHABET.length];
    return out;
  }

  async createCart(input: { vendor_id: string; staff_id?: string | null }) {
    const row = await (this as any).createScanCarts({
      vendor_id: input.vendor_id,
      staff_id: input.staff_id ?? null,
      status: 'OPEN',
    });
    return Array.isArray(row) ? row[0] : row;
  }

  private async requireOpen(id: string) {
    const [rows] = await (this as any).listAndCountScanCarts({ id });
    if (!rows.length) {
      const e: any = new Error('cart not found');
      e.code = 'not_found';
      throw e;
    }
    if (rows[0].status !== 'OPEN') {
      throw new Error(`cart ${id} is ${rows[0].status}, not open`);
    }
    return rows[0];
  }

  async addLine(cartId: string, l: AddLineInput) {
    await this.requireOpen(cartId);
    const created = await (this as any).createScanCartLines({
      cart_id: cartId,
      variant_id: l.variant_id,
      title: l.title,
      qty: l.qty,
      unit_price_minor: l.unit_price_minor,
      weigh_at_counter: l.weigh_at_counter ?? false,
      priced: !(l.weigh_at_counter ?? false),
    });
    return Array.isArray(created) ? created[0] : created;
  }

  async updateLine(
    cartId: string,
    lineId: string,
    patch: { qty?: number; unit_price_minor?: number; priced?: boolean }
  ) {
    await this.requireOpen(cartId);
    const updated = await (this as any).updateScanCartLines({ id: lineId, ...patch });
    return Array.isArray(updated) ? updated[0] : updated;
  }

  async removeLine(cartId: string, lineId: string) {
    await this.requireOpen(cartId);
    await (this as any).deleteScanCartLines(lineId);
    return { ok: true as const };
  }

  // Cashier-path price edit: allowed while PENDING_CASHIER (NOT subject to the OPEN guard).
  async priceLine(cartId: string, lineId: string, unit_price_minor: number) {
    const [rows] = await (this as any).listAndCountScanCarts({ id: cartId });
    if (!rows.length) throw new Error('cart not found');
    if (rows[0].status !== 'PENDING_CASHIER') {
      throw new Error(`cart ${cartId} is ${rows[0].status}, cannot price`);
    }
    const updated = await (this as any).updateScanCartLines({ id: lineId, unit_price_minor, priced: true });
    return Array.isArray(updated) ? updated[0] : updated;
  }

  async send(cartId: string) {
    await this.requireOpen(cartId);
    const now = new Date();
    const short_code = this.genCode();
    const updated = await (this as any).updateScanCarts({
      id: cartId,
      status: 'PENDING_CASHIER',
      short_code,
      locked_at: now,
      expires_at: new Date(now.getTime() + TTL_MS),
    });
    return Array.isArray(updated) ? updated[0] : updated;
  }

  async getWithLines(id: string) {
    const [rows] = await (this as any).listAndCountScanCarts({ id });
    if (!rows.length) return null;
    const [lines] = await (this as any).listAndCountScanCartLines(
      { cart_id: id },
      { order: { created_at: 'ASC' } }
    );
    return { ...rows[0], lines };
  }

  async getByCode(code: string) {
    const [rows] = await (this as any).listAndCountScanCarts({ short_code: code });
    if (!rows.length) return null;
    return this.getWithLines(rows[0].id);
  }

  async transition(id: string, to: ScanCartStatus, extra: Record<string, any> = {}) {
    const updated = await (this as any).updateScanCarts({ id, status: to, ...extra });
    return Array.isArray(updated) ? updated[0] : updated;
  }
}

export default ScanCartService;
