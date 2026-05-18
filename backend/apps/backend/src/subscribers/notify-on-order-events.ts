import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { NOTIFICATION_MODULE } from "../modules/notification"
import type NotificationService from "../modules/notification/service"

// Customer + vendor notifications for order lifecycle.
export default async function notifyOnOrderEvent({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const orderId = event.data.id
  if (!orderId) return

  const orderModule = container.resolve("order") as any
  const order = await orderModule.retrieveOrder(orderId).catch(() => null as any)
  if (!order) return

  const svc = container.resolve(NOTIFICATION_MODULE) as NotificationService

  const customerId = (order as any).customer_id
  if (customerId) {
    let title = "Order update"
    let body = ""
    switch (event.name) {
      case "order.placed":
        title = "Order placed 🎉"
        body = `Your order #${order.display_id ?? orderId} is confirmed.`
        break
      case "order.fulfilled":
        title = "Order on the way 🚚"
        body = `Order #${order.display_id ?? orderId} is being delivered.`
        break
      case "order.canceled":
        title = "Order canceled"
        body = `Order #${order.display_id ?? orderId} was canceled.`
        break
      default:
        body = `Order #${order.display_id ?? orderId} updated.`
    }
    await svc.sendToUser({
      user_id: customerId,
      template: event.name,
      title,
      body,
      data: { order_id: orderId },
    })
  }

  // Notify the vendor(s) — look up via sales_channel → tenant → vendors
  const scId = (order as any).sales_channel_id
  if (scId) {
    try {
      const tenantSvc = container.resolve("tenant") as any
      const [tenant] = await tenantSvc.listTenants({ sales_channel_id: scId })
      if (tenant) {
        const vendors = await tenantSvc.listVendorsForTenant(tenant.id)
        for (const v of vendors) {
          await svc.sendToUser({
            user_id: v.user_id,
            template: `vendor.${event.name}`,
            title: event.name === "order.placed" ? "New order received 🔔" : "Order updated",
            body: `Order #${order.display_id ?? orderId}`,
            data: { order_id: orderId, tenant_id: tenant.id },
          })
        }
      }
    } catch {}
  }
}

export const config: SubscriberConfig = {
  event: ["order.placed", "order.fulfilled", "order.canceled", "order.completed"],
}
