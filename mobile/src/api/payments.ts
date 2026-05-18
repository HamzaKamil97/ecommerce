import { medusaClient } from './medusaClient';

export interface PaymentProvider {
  id: string;
  label: string;
  icon_url: string | null;
  accepted_currencies: string[];
}

export async function listPaymentProviders(currency = 'IQD'): Promise<PaymentProvider[]> {
  const { data } = await medusaClient.get('/store/payments/providers', { params: { currency } });
  return data?.providers ?? [];
}

export async function initiatePayment(input: {
  provider: string;
  cart_id?: string;
  order_id?: string;
  amount_cents: number;
  currency: string;
  customer_email?: string;
  customer_phone?: string;
  success_url: string;
  failure_url: string;
}) {
  const { data } = await medusaClient.post('/store/payments/initiate', input);
  return data as { redirect_url?: string; client_token?: string; provider_ref: string; status: string };
}
