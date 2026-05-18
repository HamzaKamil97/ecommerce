import axios, { AxiosError, AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const baseURL = process.env.EXPO_PUBLIC_MEDUSA_BACKEND_URL;
const publishableApiKey = process.env.EXPO_PUBLIC_MEDUSA_PUBLISHABLE_API_KEY;

if (!baseURL) {
  // eslint-disable-next-line no-console
  console.warn('EXPO_PUBLIC_MEDUSA_BACKEND_URL is not set — set it in mobile/.env');
}

export const AUTH_TOKEN_KEY = 'medusa.auth.token';

export const medusaClient: AxiosInstance = axios.create({
  baseURL: baseURL || 'http://localhost:9000',
  headers: {
    'x-publishable-api-key': publishableApiKey || '',
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

medusaClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

medusaClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // eslint-disable-next-line no-console
    console.warn('[medusa]', error.response?.status, error.config?.url, error.message);
    return Promise.reject(error);
  }
);
