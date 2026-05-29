export type OffHit = {
  id: string;
  title: string;
  brand?: string;
  barcode?: string;
  imageUrl?: string;
  hasNutrition?: boolean;
};

export async function searchOpenFoodFacts(q: string): Promise<OffHit[]> {
  if (!q || q.length < 2) return [];
  // TODO(H-3.2d+): proxy via GET /admin/openfoodfacts?q= to avoid CORS. Stubbed for now.
  return [];
}
