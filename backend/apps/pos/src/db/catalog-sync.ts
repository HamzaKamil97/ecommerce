import { db, CatalogRow } from './dexie';
import { fetchCatalogSnapshot } from '../api/pos';

export async function syncCatalog(vendorId: string): Promise<number> {
  const snap = await fetchCatalogSnapshot(vendorId);
  await db.transaction('rw', db.catalog, async () => {
    await db.catalog.bulkPut(
      snap.items.map((it) => ({ ...it, updated_at: snap.generated_at })),
    );
  });
  return snap.items.length;
}

export async function findByBarcode(barcode: string): Promise<CatalogRow | undefined> {
  if (!barcode) return undefined;
  return db.catalog.where('barcode').equals(barcode).first();
}

export async function loadCatalogFromDb(): Promise<CatalogRow[]> {
  return db.catalog.toArray();
}
