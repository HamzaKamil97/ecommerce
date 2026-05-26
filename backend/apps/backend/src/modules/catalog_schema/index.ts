import { Module } from '@medusajs/framework/utils';
import { CatalogSchemaService } from './service';

export const CATALOG_SCHEMA_MODULE = 'catalogSchemaService';

export default Module(CATALOG_SCHEMA_MODULE, {
  service: CatalogSchemaService,
});
