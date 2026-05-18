import { medusaClient } from './medusaClient';

export interface WalletTransaction {
  id: string;
  amount_cents: number;
  currency_code: string;
  type: string;
  description: string | null;
  balance_after_cents: number;
  created_at: string;
}

export interface WalletData {
  balance_cents: number;
  currency_code: string;
  transactions: WalletTransaction[];
}

export async function getWallet(customerId: string, currency = 'usd'): Promise<WalletData> {
  const { data } = await medusaClient.get('/store/wallet', {
    params: { customer_id: customerId, currency },
  });
  return data ?? { balance_cents: 0, currency_code: currency, transactions: [] };
}

export async function topupWallet(customerId: string, amountCents: number, currency = 'usd') {
  const { data } = await medusaClient.post('/store/wallet/topup', {
    customer_id: customerId,
    amount_cents: amountCents,
    currency,
  });
  return data;
}
