import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ADDRESSES_MODULE } from "../../../../modules/addresses"
import type AddressesService from "../../../../modules/addresses/service"

// POST /store/addresses/{id}           update (incl. set_default)
// DELETE /store/addresses/{id}         delete

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(ADDRESSES_MODULE) as AddressesService
  const body = (req.body as any) || {}
  const customerId = (req as any).auth_context?.actor_id ?? body.customer_id

  if (body.set_default && customerId) {
    const row = await svc.setDefault(req.params.id, customerId)
    return res.json({ address: row })
  }
  const updated = await (svc as any).updateCustomerAddresses({ id: req.params.id, ...body })
  res.json({ address: updated })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(ADDRESSES_MODULE) as AddressesService
  await (svc as any).deleteCustomerAddresses(req.params.id)
  res.json({ id: req.params.id, deleted: true })
}
