import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { LOYALTY_MODULE } from "../modules/loyalty"
import type LoyaltyService from "../modules/loyalty/service"

// On every order placed, award loyalty points + fulfill any pending referral (first order).
export default async function loyaltyOnOrderPlaced({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const orderId = event.data.id
  if (!orderId) return

  const orderModule = container.resolve("order") as any
  const order = await orderModule.retrieveOrder(orderId).catch(() => null as any)
  if (!order || !order.customer_id) return

  const svc = container.resolve(LOYALTY_MODULE) as LoyaltyService
  await svc.awardPointsForOrder(order.customer_id, order.total ?? 0, orderId).catch(() => {})

  // Check if this is the customer's first order — fulfill referral
  try {
    const allOrders = await orderModule.listOrders({ customer_id: order.customer_id }, { take: 2 })
    if (allOrders.length === 1) {
      await svc.fulfillReferralOnFirstOrder(order.customer_id, orderId).catch(() => {})
    }
  } catch {}
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
