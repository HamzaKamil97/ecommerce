import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { NOTIFICATION_MODULE } from "../../../modules/notification"
import type NotificationService from "../../../modules/notification/service"

// GET /store/notifications              list in-app inbox for authenticated customer
// Header: requires customer auth → x-customer-id from middleware or fallback to ?user_id= for stub.

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(NOTIFICATION_MODULE) as NotificationService
  const userId = (req as any).auth_context?.actor_id ?? String(req.query.user_id ?? "")
  if (!userId) return res.json({ notifications: [], count: 0 })
  const notifications = await svc.listInbox(userId, Math.min(100, Number(req.query.limit ?? 50)))
  const unread = await svc.unreadCount(userId)
  res.json({ notifications, count: notifications.length, unread })
}
