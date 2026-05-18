import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { NOTIFICATION_MODULE } from "../../../../modules/notification"
import type NotificationService from "../../../../modules/notification/service"

// POST /store/notifications/push-token   body: { token, platform?, device_name? }
//   (sender auth: customer or vendor; user_id taken from auth_context or body.user_id for stub)

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(NOTIFICATION_MODULE) as NotificationService
  const body = (req.body as any) || {}
  const userId = (req as any).auth_context?.actor_id ?? body.user_id
  if (!userId || !body.token) return res.status(400).json({ error: "user_id and token required" })
  const row = await svc.registerToken({
    user_id: userId,
    user_type: body.user_type ?? "customer",
    token: body.token,
    platform: body.platform,
    device_name: body.device_name,
  })
  res.json({ token: row })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(NOTIFICATION_MODULE) as NotificationService
  const body = (req.body as any) || {}
  if (!body.token) return res.status(400).json({ error: "token required" })
  await svc.unregisterToken(body.token)
  res.json({ ok: true })
}
