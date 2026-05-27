// backend/apps/backend/src/modules/online_order/index.ts
import { Module } from '@medusajs/framework/utils';
import { OnlineOrderService } from './service';

export const ONLINE_ORDER_MODULE = 'onlineOrderService';

export default Module(ONLINE_ORDER_MODULE, {
  service: OnlineOrderService,
});
