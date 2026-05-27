// backend/apps/backend/src/modules/inventory_count/index.ts
import { Module } from '@medusajs/framework/utils';
import { InventoryCountService } from './service';

export const INVENTORY_COUNT_MODULE = 'inventoryCountService';

export default Module(INVENTORY_COUNT_MODULE, {
  service: InventoryCountService,
});
