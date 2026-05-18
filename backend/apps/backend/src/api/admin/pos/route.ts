import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { POS_MODULE } from "../../../modules/pos"
import type PosService from "../../../modules/pos/service"

// GET  /admin/pos              → adapter registry + health
// POST /admin/pos/sync         → manually trigger an inventory pull for one provider
//   body: { pos_provider: "noop" }

export async function GET(_req: MedusaRequest, res: MedusaResponse) {
  const pos: PosService = _req.scope.resolve(POS_MODULE)
  const [skuCount] = await pos.listAndCountSkuMappings({})
  const [syncLogCount] = await pos.listAndCountInventorySyncLogs({})
  const [orderLogCount] = await pos.listAndCountOrderExportLogs({})
  res.json({
    module: POS_MODULE,
    counts: {
      sku_mappings: skuCount,
      inventory_sync_logs: syncLogCount,
      order_export_logs: orderLogCount,
    },
    health: await pos.ping("noop"),
  })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const pos: PosService = req.scope.resolve(POS_MODULE)
  const body = req.body as { pos_provider?: string }
  const provider = body?.pos_provider ?? "noop"
  const result = await pos.syncInventoryFromPos(provider)
  res.json({ provider, ...result })
}
