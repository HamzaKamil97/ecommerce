import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { NOTIFICATION_MODULE } from "../../../../../modules/notification"
import type NotificationService from "../../../../../modules/notification/service"

// POST /store/notifications/{id}/read    mark a notification as read.

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(NOTIFICATION_MODULE) as NotificationService
  const updated = await svc.markRead(req.params.id)
  res.json({ notification: updated })
}
