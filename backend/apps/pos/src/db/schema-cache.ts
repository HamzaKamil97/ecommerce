import { db } from './dexie';
import { fetchSchema, type FieldDef } from '../api/pos';

const TTL_MS = 24 * 60 * 60 * 1000;

export async function getCachedSchema(handle: string): Promise<{ category_handle: string; fields: FieldDef[] }> {
  const row = await db.schemas.get(handle);
  if (row) {
    const age = Date.now() - new Date(row.cached_at).getTime();
    if (age < TTL_MS) return { category_handle: handle, fields: row.fields_json as FieldDef[] };
  }
  const fresh = await fetchSchema(handle);
  await db.schemas.put({
    category_handle: handle,
    fields_json: fresh.fields,
    cached_at: new Date().toISOString(),
  });
  return fresh;
}
