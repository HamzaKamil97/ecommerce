import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ADDRESSES_MODULE } from "../../../modules/addresses"
import type AddressesService from "../../../modules/addresses/service"

// GET  /store/addresses           list current customer's addresses
// POST /store/addresses           create

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(ADDRESSES_MODULE) as AddressesService
  const customerId = (req as any).auth_context?.actor_id ?? String(req.query.customer_id ?? "")
  if (!customerId) return res.status(401).json({ error: "Authentication required" })
  const addresses = await svc.listForCustomer(customerId)
  res.json({ addresses, count: addresses.length })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(ADDRESSES_MODULE) as AddressesService
  const body = (req.body as any) || {}
  const customerId = (req as any).auth_context?.actor_id ?? body.customer_id
  if (!customerId) return res.status(401).json({ error: "Authentication required" })
  if (!body.street || !body.city || !body.country_code) {
    return res.status(400).json({ error: "street, city, country_code required" })
  }
  const created = await (svc as any).createCustomerAddresses({ ...body, customer_id: customerId })
  res.status(201).json({ address: created })
}
