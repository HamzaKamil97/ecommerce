import AsyncStorage from '@react-native-async-storage/async-storage';
import { medusaClient, AUTH_TOKEN_KEY } from './medusaClient';

export interface Customer {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

export async function register(params: {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
}): Promise<Customer> {
  const tokenRes = await medusaClient.post('/auth/customer/emailpass/register', {
    email: params.email,
    password: params.password,
  });
  const token: string = tokenRes.data?.token;
  if (token) await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);

  const { data } = await medusaClient.post('/store/customers', {
    email: params.email,
    first_name: params.first_name,
    last_name: params.last_name,
  });
  return data?.customer;
}

export async function login(email: string, password: string): Promise<Customer> {
  const tokenRes = await medusaClient.post('/auth/customer/emailpass', { email, password });
  const token: string = tokenRes.data?.token;
  if (token) await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);

  const { data } = await medusaClient.get('/store/customers/me');
  return data?.customer;
}

export async function logout(): Promise<void> {
  await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
}

export async function me(): Promise<Customer | null> {
  try {
    const { data } = await medusaClient.get('/store/customers/me');
    return data?.customer ?? null;
  } catch {
    return null;
  }
}

export async function listOrders() {
  const { data } = await medusaClient.get('/store/orders');
  return data?.orders ?? [];
}
