import { medusaClient } from './medusaClient';

export async function createCart(regionId?: string) {
  const { data } = await medusaClient.post('/store/carts', regionId ? { region_id: regionId } : {});
  return data?.cart;
}

export async function getCart(cartId: string) {
  const { data } = await medusaClient.get(`/store/carts/${cartId}`);
  return data?.cart;
}

export async function addLineItem(cartId: string, variantId: string, quantity: number) {
  const { data } = await medusaClient.post(`/store/carts/${cartId}/line-items`, {
    variant_id: variantId,
    quantity,
  });
  return data?.cart;
}

export async function updateLineItem(cartId: string, lineId: string, quantity: number) {
  const { data } = await medusaClient.post(`/store/carts/${cartId}/line-items/${lineId}`, {
    quantity,
  });
  return data?.cart;
}

export async function removeLineItem(cartId: string, lineId: string) {
  const { data } = await medusaClient.delete(`/store/carts/${cartId}/line-items/${lineId}`);
  return data?.cart;
}

export async function completeCart(cartId: string) {
  const { data } = await medusaClient.post(`/store/carts/${cartId}/complete`);
  return data;
}
