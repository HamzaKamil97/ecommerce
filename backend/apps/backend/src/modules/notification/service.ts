import { MedusaService } from "@medusajs/framework/utils"
import { PushToken } from "./models/push-token"
import { NotificationRecord } from "./models/notification-record"

// Provider-agnostic. Wire Expo Push, FCM, APNs, SendGrid, Twilio in each adapter.
// For now, "stub" adapter just records to in-app inbox.

class NotificationService extends MedusaService({
  PushToken,
  NotificationRecord,
}) {
  async registerToken(input: {
    user_id: string
    user_type?: "customer" | "vendor" | "driver"
    token: string
    platform?: "ios" | "android" | "web" | "expo"
    device_name?: string
  }) {
    // Upsert by token
    const existing = await this.listPushTokens({ token: input.token })
    if (existing.length > 0) {
      return (this as any).updatePushTokens({
        id: existing[0].id,
        user_id: input.user_id,
        is_active: true,
        platform: input.platform ?? existing[0].platform,
      })
    }
    return (this as any).createPushTokens({
      user_id: input.user_id,
      user_type: input.user_type ?? "customer",
      token: input.token,
      platform: input.platform ?? "expo",
      device_name: input.device_name ?? null,
    })
  }

  async unregisterToken(token: string) {
    const [row] = await this.listPushTokens({ token })
    if (!row) return null
    return (this as any).updatePushTokens({ id: row.id, is_active: false })
  }

  async sendToUser(input: {
    user_id: string
    template: string
    title: string
    body: string
    data?: any
    channels?: Array<"push" | "email" | "sms" | "in_app">
  }) {
    const channels = input.channels ?? ["push", "in_app"]
    const results: any[] = []

    for (const channel of channels) {
      try {
        let deliveredAt: Date | null = null
        let status: "sent" | "delivered" | "failed" = "sent"

        if (channel === "push") {
          const tokens = await this.listPushTokens({ user_id: input.user_id, is_active: true })
          await this._sendPush(tokens, input.title, input.body, input.data)
          deliveredAt = new Date()
          status = "delivered"
        } else if (channel === "in_app") {
          deliveredAt = new Date()
          status = "delivered"
        }
        // email + sms: TODO — adapter pattern

        const rec = await (this as any).createNotificationRecords({
          user_id: input.user_id,
          channel,
          template: input.template,
          title: input.title,
          body: input.body,
          data: input.data ?? null,
          delivered_at: deliveredAt,
          delivery_status: status,
        })
        results.push(rec)
      } catch (err: any) {
        const rec = await (this as any).createNotificationRecords({
          user_id: input.user_id,
          channel,
          template: input.template,
          title: input.title,
          body: input.body,
          data: input.data ?? null,
          delivery_status: "failed",
          error: err?.message ?? String(err),
        })
        results.push(rec)
      }
    }
    return results
  }

  // Expo push — works for Expo Go and EAS-built apps.
  private async _sendPush(tokens: any[], title: string, body: string, data: any) {
    if (!tokens.length) return
    const messages = tokens
      .filter((t) => t.token.startsWith("ExponentPushToken[") || t.platform === "expo")
      .map((t) => ({ to: t.token, title, body, data: data ?? {}, sound: "default" }))
    if (!messages.length) return

    try {
      const res = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(messages),
      })
      if (!res.ok) throw new Error(`expo push: ${res.status}`)
    } catch (e) {
      // Silently swallow in dev; production should retry + dead-letter.
    }
  }

  async listInbox(userId: string, limit = 50) {
    return this.listNotificationRecords(
      { user_id: userId, channel: "in_app" as any },
      { take: limit, order: { created_at: "desc" } as any }
    )
  }

  async markRead(notificationId: string) {
    return (this as any).updateNotificationRecords({
      id: notificationId,
      read_at: new Date(),
      delivery_status: "read",
    })
  }

  async unreadCount(userId: string) {
    const rows = await this.listNotificationRecords({ user_id: userId, channel: "in_app" as any })
    return rows.filter((r) => !r.read_at).length
  }
}

export default NotificationService
