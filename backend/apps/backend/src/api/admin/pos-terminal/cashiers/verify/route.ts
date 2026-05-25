import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve("posTerminalService")
  const { cashier_id, pin } = (req.body ?? {}) as any
  if (!cashier_id || !pin) {
    return res.status(400).json({ error: "cashier_id and pin required" })
  }
  try {
    const cashier = await svc.verifyCashierPin(cashier_id, pin)
    res.json({ cashier })
  } catch (e: any) {
    res.status(401).json({ error: "bad pin", code: e?.code ?? "POS_TERMINAL_BAD_PIN" })
  }
}
