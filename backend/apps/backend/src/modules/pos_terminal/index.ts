import { Module } from '@medusajs/framework/utils';
import { PosTerminalService } from './service';

export const POS_TERMINAL_MODULE = 'posTerminalService';

export default Module(POS_TERMINAL_MODULE, {
  service: PosTerminalService,
});
