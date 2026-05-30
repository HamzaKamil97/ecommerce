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
    vendor_id = rows?.[0]?.vendor_id
  } catch {
    // non-fatal — audit row will have no vendor_id but the reset still proceeds
  }
  ;(req as any).audit_context = { vendor_id }

  const result = await svc.resetCashierPin(id, pin)
  return res.json(result)
}
