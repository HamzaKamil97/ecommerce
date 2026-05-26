export type FieldKind =
  | 'text' | 'textarea' | 'number' | 'price_minor'
  | 'select' | 'multi_select' | 'date' | 'boolean' | 'image';

export type FieldDef = {
  key: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  options?: string[];
  unit?: string;
  help?: string;
};

export type CategoryDTO = {
  id: string;
  handle: string;
  name: string;
  icon: string | null;
  position: number;
};

export type SchemaDTO = {
  category_handle: string;
  fields: FieldDef[];
  updated_at: string;
};

export interface CatalogSchemaServiceInterface {
  ping(): string;
  listCategories(): Promise<CategoryDTO[]>;
  getSchemaByHandle(handle: string): Promise<SchemaDTO | null>;
}
