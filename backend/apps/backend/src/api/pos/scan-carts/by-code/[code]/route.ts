import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve('scanCartService');
  const code = (req.params as any).code as string;

  const cart = await svc.getByCode(code);
  if (!cart) {
    return res.status(404).json({ error: 'cart not found' });
  }

  // Lazy-expire: if the cart is PENDING_CASHIER and past its TTL, transition it and return 410.
  if (
    cart.status === 'PENDING_CASHIER' &&
    cart.expires_at &&
    new Date(cart.expires_at) < new Date()
  ) {
    await svc.transition(cart.id, 'EXPIRED');
    return res.status(410).json({ error: 'cart expired' });
  }

  res.json({ cart });
}
