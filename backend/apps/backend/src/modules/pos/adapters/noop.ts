import type { PosAdapter, PosOrder, PosInventoryRecord } from "./types"

// Safe default: does nothing, returns empty data, succeeds.
// Replace with a real adapter (e.g. SquareAdapter, TapAdapter, LocalDbAdapter) per tenant.
export class NoopAdapter implements PosAdapter {
  readonly name = "noop"

  async fetchInventory(_skus: string[]): Promise<PosInventoryRecord[]> {
    return []
  }

  async pushOrder(order: PosOrder): Promise<{ pos_order_id: string }> {
    return { pos_order_id: `noop-${order.medusa_order_id}` }
  }

  async resolveBySku(_sku: string) {
    return null
  }

  async ping() {
    return { ok: true, details: "noop adapter — no external POS configured" }
  }
}
