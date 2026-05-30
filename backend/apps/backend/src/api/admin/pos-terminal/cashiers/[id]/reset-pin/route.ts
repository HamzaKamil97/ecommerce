import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const id = (req.params as any).id as string
  const pin = ((req.body ?? {}) as any).pin

  if (typeof pin !== "string" || !/^\d{4}$/.test(pin)) {
    return res.status(400).json({ error: "pin must be exactly 4 digits" })
  }

  const svc: any = req.scope.resolve("posTerminalService")

  // Fetch cashier to get vendor_id for audit context (never echo the raw pin)
  let vendor_id: string | undefined
  try {
    const [rows] = await svc.listAndCountCashiers({ id })
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "cashier not found" })
    }
    vendor_id = rows[0].vendor_id
  } catch {
    // non-fatal — audit row will have no vendor_id but the reset still proceeds
  }
  // NOTE: req.body still carries the raw pin into the audit middleware's after_json snapshot; Pass 4 strips sensitive keys (pin) from audit writes globally.
  ;(req as any).audit_context = { vendor_id }

  const result = await svc.resetCashierPin(id, pin)
  return res.json(result)
}
