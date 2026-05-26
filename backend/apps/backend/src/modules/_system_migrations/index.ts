import { Module } from '@medusajs/framework/utils';
import { SystemMigrationsService } from './service';

export const SYSTEM_MIGRATIONS_MODULE = 'systemMigrationsService';

export default Module(SYSTEM_MIGRATIONS_MODULE, {
  service: SystemMigrationsService,
});
