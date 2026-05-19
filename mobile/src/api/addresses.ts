import { medusaClient } from './medusaClient';

export interface Address {
  id: string;
  customer_id: string;
  label?: string | null;
  recipient_name?: string | null;
  phone?: string | null;
  street: string;
  building?: string | null;
  apartment?: string | null;
  city: string;
  region?: string | null;
  postcode?: string | null;
  country_code: string;
  delivery_instructions?: string | null;
  is_default: boolean;
  lat?: number | null;
  lng?: number | null;
}

export type AddressInput = Omit<Address, 'id' | 'customer_id' | 'is_default'> & { is_default?: boolean };

export async function listAddresses(): Promise<Address[]> {
  const { data } = await medusaClient.get('/store/addresses');
  return data?.addresses ?? [];
}

export async function createAddress(input: AddressInput): Promise<Address> {
  const { data } = await medusaClient.post('/store/addresses', input);
  return data?.address;
}

export async function updateAddress(id: string, input: Partial<AddressInput>): Promise<Address> {
  const { data } = await medusaClient.post(`/store/addresses/${id}`, input);
  return data?.address;
}

export async function deleteAddress(id: string): Promise<void> {
  await medusaClient.delete(`/store/addresses/${id}`);
}
