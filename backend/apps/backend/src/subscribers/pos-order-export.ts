import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { POS_MODULE } from "../modules/pos"
import type PosService from "../modules/pos/service"
import type { PosOrder } from "../modules/pos/adapters/types"

// When an order is placed, push it to the configured POS (default: noop adapter).
// Per-tenant POS provider can be resolved here from order metadata or sales channel.

export default async function posOrderExportHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const orderId = event.data.id
  if (!orderId) return

  const orderModule = container.resolve("order")
  const order = await orderModule.retrieveOrder(orderId, {
    relations: ["items"],
  })

  const pos: PosService = container.resolve(POS_MODULE)

  // Per-tenant routing TBD — use sales_channel.metadata.pos_provider or default to noop.
  const posProvider =
    (order as any)?.sales_channel?.metadata?.pos_provider ?? "noop"

  const posOrder: PosOrder = {
    medusa_order_id: order.id,
    customer_email: (order as any).email ?? "",
    total: (order as any).total ?? 0,
    currency_code: (order as any).currency_code ?? "usd",
    lines: ((order as any).items ?? []).map((item: any) => ({
      sku: item.variant_sku ?? item.product_handle ?? item.id,
      quantity: item.quantity,
      unit_price: item.unit_price,
    })),
  }

  await pos.exportOrder(posProvider, posOrder)
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
