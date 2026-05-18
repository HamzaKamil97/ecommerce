import { MedusaService } from "@medusajs/framework/utils"
import { SkuMapping } from "./models/sku-mapping"
import { InventorySyncLog } from "./models/inventory-sync-log"
import { OrderExportLog } from "./models/order-export-log"
import { NoopAdapter } from "./adapters/noop"
import type { PosAdapter, PosOrder } from "./adapters/types"

class PosService extends MedusaService({
  SkuMapping,
  InventorySyncLog,
  OrderExportLog,
}) {
  private adapters = new Map<string, PosAdapter>()

  constructor() {
    super(...arguments as unknown as [])
    // Register built-in adapters here. Per-tenant adapters can be injected via DI later.
    this.registerAdapter(new NoopAdapter())
  }

  registerAdapter(adapter: PosAdapter) {
    this.adapters.set(adapter.name, adapter)
  }

  getAdapter(name: string): PosAdapter {
    const adapter = this.adapters.get(name)
    if (!adapter) {
      throw new Error(`No POS adapter registered with name "${name}"`)
    }
    return adapter
  }

  // ---------- Inventory ----------

  async syncInventoryFromPos(pos_provider: string) {
    const adapter = this.getAdapter(pos_provider)
    const mappings = await this.listSkuMappings({ pos_provider })
    const skus = mappings.map((m) => m.sku)
    if (!skus.length) return { processed: 0 }

    const records = await adapter.fetchInventory(skus)
    let processed = 0
    for (const rec of records) {
      const mapping = mappings.find((m) => m.sku === rec.sku)
      await this.createInventorySyncLogs([{
        source: "pos",
        pos_provider,
        sku: rec.sku,
        medusa_variant_id: mapping?.medusa_variant_id ?? null,
        old_quantity: null,
        new_quantity: rec.quantity,
        status: "success",
        attempts: 1,
      }])
      processed++
    }
    return { processed }
  }

  // ---------- Orders ----------

  async exportOrder(pos_provider: string, order: PosOrder) {
    const adapter = this.getAdapter(pos_provider)
    const [existing] = await this.listOrderExportLogs({
      medusa_order_id: order.medusa_order_id,
      pos_provider,
    })

    if (existing?.status === "success") {
      return existing
    }

    try {
      const { pos_order_id } = await adapter.pushOrder(order)
      if (existing) {
        return await this.updateOrderExportLogs({
          id: existing.id,
          pos_order_id,
          status: "success",
          attempts: (existing.attempts ?? 0) + 1,
          last_attempt_at: new Date(),
          error_message: null,
        })
      }
      return await this.createOrderExportLogs({
        medusa_order_id: order.medusa_order_id,
        pos_provider,
        pos_order_id,
        status: "success",
        attempts: 1,
        last_attempt_at: new Date(),
      })
    } catch (err: any) {
      const errorMsg = err?.message ?? String(err)
      if (existing) {
        return await this.updateOrderExportLogs({
          id: existing.id,
          status: "failed",
          attempts: (existing.attempts ?? 0) + 1,
          last_attempt_at: new Date(),
          error_message: errorMsg,
        })
      }
      return await this.createOrderExportLogs({
        medusa_order_id: order.medusa_order_id,
        pos_provider,
        status: "failed",
        attempts: 1,
        last_attempt_at: new Date(),
        error_message: errorMsg,
      })
    }
  }

  // ---------- Health ----------

  async ping(pos_provider: string) {
    return this.getAdapter(pos_provider).ping()
  }
}

export default PosService
