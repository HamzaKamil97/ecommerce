import { MedusaService } from '@medusajs/framework/utils';

class SystemMigrationsServiceBase extends MedusaService({}) {}

export class SystemMigrationsService extends SystemMigrationsServiceBase {
  ping(): string { return 'system-migrations-ok'; }
}

export default SystemMigrationsService;
