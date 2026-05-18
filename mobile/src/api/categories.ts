import { medusaClient } from './medusaClient';

export interface Category {
  id: string;
  name: string;
  handle: string;
  description?: string;
  parent_category_id?: string | null;
}

const EMOJI_MAP: Record<string, string> = {
  food: '🍔',
  flowers: '🌹',
  vegetables: '🥕',
  electronics: '🎧',
  fashion: '👕',
  shirts: '👕',
  pants: '👖',
  sweatshirts: '🧥',
  merch: '🎁',
};

export function emojiForCategory(handle: string): string {
  return EMOJI_MAP[handle.toLowerCase()] ?? '🛍️';
}

export async function listCategories(): Promise<Category[]> {
  const { data } = await medusaClient.get('/store/product-categories', {
    params: { limit: 50 },
  });
  return data?.product_categories ?? [];
}
