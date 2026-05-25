import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve("posTerminalService")
  const vendor_id = req.query.vendor_id as string | undefined
  if (!vendor_id) return res.status(400).json({ error: "vendor_id required" })
  const cashiers = await svc.listCashiers(vendor_id)
  res.json({ cashiers })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc: any = req.scope.resolve("posTerminalService")
  const { vendor_id, name, pin, role } = (req.body ?? {}) as any
  if (!vendor_id || !name || !pin || !role) {
    return res.status(400).json({ error: "vendor_id, name, pin, role required" })
  }
  if (!["cashier", "manager"].includes(role)) {
    return res.status(400).json({ error: "role must be cashier or manager" })
  }
  const cashier = await svc.createCashier({ vendor_id, name, pin, role })
  res.json({ cashier })
}
