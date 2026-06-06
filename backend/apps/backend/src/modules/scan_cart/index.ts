import { Module } from '@medusajs/framework/utils';
import { ScanCartService } from './service';

export const SCAN_CART_MODULE = 'scanCartService';

export default Module(SCAN_CART_MODULE, { service: ScanCartService });
