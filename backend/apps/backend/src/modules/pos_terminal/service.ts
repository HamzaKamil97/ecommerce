import { MedusaService } from '@medusajs/framework/utils';
import { PosTerminalServiceInterface } from './types';

class PosTerminalServiceBase extends MedusaService({}) {}

export class PosTerminalService extends PosTerminalServiceBase
  implements Pick<PosTerminalServiceInterface, 'ping'> {
  ping(): string { return 'pos-terminal-ok'; }
}

export default PosTerminalService;
