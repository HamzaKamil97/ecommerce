import { MedusaService } from '@medusajs/framework/utils';
import { Sale } from './models/sale.model';
import { SaleLine } from './models/sale-line.model';
import {
  CashierDTO,
  CreateCashierInput,
  PosTerminalServiceInterface,
  RecordSaleInput,
  RecordSaleResult,
} from './types';

class PosTerminalServiceBase extends MedusaService({ Sale, SaleLine }) {}

export class PosTerminalService extends PosTerminalServiceBase
  implements PosTerminalServiceInterface {
  ping(): string {
    return 'pos-terminal-ok';
  }

  recordSale(_input: RecordSaleInput): Promise<RecordSaleResult> {
    throw new Error('not implemented');
  }

  createCashier(_input: CreateCashierInput): Promise<CashierDTO> {
    throw new Error('not implemented');
  }

  listCashiers(
    _vendorId: string,
  ): Promise<Array<CashierDTO & { pin_hash_prefix: string }>> {
    throw new Error('not implemented');
  }

  verifyCashierPin(_cashierId: string, _pin: string): Promise<CashierDTO> {
    throw new Error('not implemented');
  }
}

export default PosTerminalService;
