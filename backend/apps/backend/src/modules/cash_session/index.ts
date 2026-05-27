// backend/apps/backend/src/modules/cash_session/index.ts
import { Module } from '@medusajs/framework/utils';
import { CashSessionService } from './service';

export const CASH_SESSION_MODULE = 'cashSessionService';

export default Module(CASH_SESSION_MODULE, {
  service: CashSessionService,
});
