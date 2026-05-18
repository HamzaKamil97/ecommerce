import { medusaClient } from './medusaClient';

export interface LoyaltyData {
  points: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  referral_code: string | null;
}

export async function getLoyalty(customerId: string): Promise<LoyaltyData> {
  const { data } = await medusaClient.get('/store/loyalty', { params: { customer_id: customerId } });
  return data;
}

export async function applyReferralCode(customerId: string, referralCode: string) {
  const { data } = await medusaClient.post('/store/loyalty/refer', {
    customer_id: customerId,
    referral_code: referralCode,
  });
  return data;
}

const TIER_THRESHOLDS = { bronze: 0, silver: 1000, gold: 5000, platinum: 20000 };
const TIER_COLORS = { bronze: '#CD7F32', silver: '#C0C0C0', gold: '#FFD700', platinum: '#E5E4E2' };

export function nextTier(currentTier: string): { tier: string; threshold: number } | null {
  const order = ['bronze', 'silver', 'gold', 'platinum'];
  const idx = order.indexOf(currentTier);
  if (idx === -1 || idx >= order.length - 1) return null;
  const next = order[idx + 1] as keyof typeof TIER_THRESHOLDS;
  return { tier: next, threshold: TIER_THRESHOLDS[next] };
}

export function tierColor(tier: string): string {
  return TIER_COLORS[tier as keyof typeof TIER_COLORS] ?? '#888';
}
