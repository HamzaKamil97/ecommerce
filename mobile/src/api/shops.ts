import { medusaClient } from './medusaClient';

export interface Shop {
  id: string;
  slug: string;
  name: string;
  vertical: string;
  sales_channel_id?: string | null;
  branding?: {
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
  } | null;
  approval_status: 'pending' | 'approved' | 'suspended';
}

export interface VerticalTemplate {
  vertical: string;
  label: string;
  emoji: string;
  fields: Array<{
    key: string;
    label: string;
    type: string;
    required?: boolean;
    options?: string[];
    help?: string;
  }>;
}

// Public list of all approved shops (super-app "Shops" tab).
// Note: there's no /store/tenants list endpoint yet — we'll add it. For now,
// the admin endpoint works if you pass an admin token; otherwise stub to empty.
export async function listApprovedShops(): Promise<Shop[]> {
  try {
    const { data } = await medusaClient.get('/store/tenants');
    return (data?.tenants ?? []).filter((t: any) => t.approval_status === 'approved');
  } catch {
    return [];
  }
}

export async function getShopBySlug(slug: string): Promise<Shop | null> {
  try {
    const { data } = await medusaClient.get(`/store/tenants/${slug}`);
    return data?.tenant ?? null;
  } catch {
    return null;
  }
}

export async function listVerticalTemplates(): Promise<VerticalTemplate[]> {
  try {
    const { data } = await medusaClient.get('/store/verticals');
    return data?.templates ?? [];
  } catch {
    return [];
  }
}

const VERTICAL_EMOJI: Record<string, string> = {
  food: '🍔',
  grocery: '🛒',
  vegetables: '🥕',
  flowers: '🌹',
  electronics: '🎧',
  fashion: '👕',
  pharmacy: '💊',
  pets: '🐾',
  beauty: '💄',
  general: '🛍️',
};

export function emojiForVertical(v: string): string {
  return VERTICAL_EMOJI[v] ?? '🛍️';
}
