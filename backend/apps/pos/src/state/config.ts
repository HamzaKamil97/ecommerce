import { db } from '../db/dexie';

export type QuickButton = { variant_id: string; label: string; color: string };

export type Config = {
  theme: 'dark' | 'light';
  quick_buttons: QuickButton[];
  shop_name: string;
  vendor_address: string;
};

export const defaultConfig: Config = {
  theme: 'dark',
  quick_buttons: [],
  shop_name: 'Hanoot Shop',
  vendor_address: '',
};

export async function loadConfig(): Promise<Config> {
  const row = await db.config.get('app');
  return (row?.value as Config) ?? { ...defaultConfig, quick_buttons: [] };
}

export async function saveConfig(c: Config): Promise<void> {
  await db.config.put({ key: 'app', value: c });
}
