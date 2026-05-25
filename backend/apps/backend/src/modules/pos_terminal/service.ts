import { MedusaService } from '@medusajs/framework/utils';
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { Sale } from './models/sale.model';
import { SaleLine } from './models/sale-line.model';
import { Cashier } from './models/cashier.model';
import {
  CashierDTO,
  CreateCashierInput,
  PosTerminalServiceInterface,
  RecordSaleInput,
  RecordSaleResult,
} from './types';
import { PosTerminalBadPinError } from './errors';

class PosTerminalServiceBase extends MedusaService({ Sale, SaleLine, Cashier }) {}

const SCRYPT_KEYLEN = 32;
function hashPin(pin: string, salt: string): string {
  return scryptSync(pin, salt, SCRYPT_KEYLEN).toString('hex');
}

export class PosTerminalService extends PosTerminalServiceBase
  implements PosTerminalServiceInterface {
  ping(): string {
    return 'pos-terminal-ok';
  }

  recordSale(_input: RecordSaleInput): Promise<RecordSaleResult> {
    throw new Error('not implemented');
  }

  async createCashier(input: CreateCashierInput): Promise<CashierDTO> {
    const salt = randomBytes(16).toString('hex');
    const pin_hash = hashPin(input.pin, salt);
    const created = await (this as any).createCashiers({
      vendor_id: input.vendor_id,
      name: input.name,
      role: input.role,
      pin_hash,
      pin_salt: salt,
      active: true,
    });
    const row: any = Array.isArray(created) ? created[0] : created;
    return {
      id: row.id,
      vendor_id: row.vendor_id,
      name: row.name,
      role: row.role,
      active: row.active,
    };
  }

  async listCashiers(vendorId: string) {
    const [rows] = await (this as any).listAndCountCashiers({
      vendor_id: vendorId,
      active: true,
    });
    return rows.map((r: any) => ({
      id: r.id,
      vendor_id: r.vendor_id,
      name: r.name,
      role: r.role,
      active: r.active,
      pin_hash_prefix: String(r.pin_hash).slice(0, 8),
    }));
  }

  async verifyCashierPin(cashierId: string, pin: string): Promise<CashierDTO> {
    const [rows] = await (this as any).listAndCountCashiers({
      id: cashierId,
      active: true,
    });
    if (!rows.length) throw new PosTerminalBadPinError(cashierId);
    const r = rows[0];
    const candidate = Buffer.from(hashPin(pin, r.pin_salt), 'hex');
    const stored = Buffer.from(r.pin_hash, 'hex');
    if (candidate.length !== stored.length || !timingSafeEqual(candidate, stored)) {
      throw new PosTerminalBadPinError(cashierId);
    }
    return {
      id: r.id,
      vendor_id: r.vendor_id,
      name: r.name,
      role: r.role,
      active: r.active,
    };
  }
}

export default PosTerminalService;
