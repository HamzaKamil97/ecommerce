import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

// GET /pos/alerts?vendor_id=<id>
// Surfaces wms stock-drift findings to the cashier register as alert rows.
// Maps wmsService.detectStockDrift().flagged -> the POS AlertRow shape (apps/pos/src/api/alerts.ts).
type AlertRow = {
  id: string
  severity: "critical" | "warning" | "info"
  title: string
  message: string
  type: string
  created_at: string
  read_at: string | null
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const vendor_id = req.query.vendor_id as string | undefined
  if (!vendor_id) return res.status(400).json({ error: "vendor_id required" })

  const now = new Date().toISOString()
  let alerts: AlertRow[] = []
  try {
    const wms: any = req.scope.resolve("wmsService")
    const report = await wms.detectStockDrift({ vendor_id })
    alerts = (report?.flagged ?? []).map((d: any) => {
      const negative = d.flag === "negative_on_hand"
      return {
        id: `drift_${d.variant_id}_${d.flag}`,
        severity: negative ? ("critical" as const) : ("warning" as const),
        title: negative ? "Negative on-hand" : "Reserved exceeds on-hand",
        message: negative
          ? `${d.variant_id}: on-hand is ${d.on_hand}`
          : `${d.variant_id}: reserved ${d.reserved} exceeds on-hand ${d.on_hand}`,
        type: "stock_drift",
        created_at: now,
        read_at: null,
      }
    })
  } catch {
    // wms unavailable / no stock records yet — degrade to an empty list (route still 200s).
    alerts = []
  }

  res.json({ vendor_id, alerts })
}
