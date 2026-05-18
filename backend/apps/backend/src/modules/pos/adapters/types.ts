// Contract every POS adapter must implement.
// Add a new POS by creating a new file under adapters/<name>.ts and registering it in service.ts.

export interface PosOrderLine {
  sku: string
  quantity: number
  unit_price: number
}

export interface PosOrder {
  medusa_order_id: string
  customer_email: string
  total: number
  currency_code: string
  lines: PosOrderLine[]
}

export interface PosInventoryRecord {
  sku: string
  quantity: number
  pos_variant_id?: string
}

export interface PosAdapter {
  /** Unique name, used in DB as pos_provider */
  readonly name: string

  /** Pull current inventory for the given SKUs from the POS. */
  fetchInventory(skus: string[]): Promise<PosInventoryRecord[]>

  /** Push a completed Medusa order to the POS. */
  pushOrder(order: PosOrder): Promise<{ pos_order_id: string }>

  /** Resolve POS-specific product/variant IDs by SKU. */
  resolveBySku(sku: string): Promise<{ pos_product_id?: string; pos_variant_id?: string } | null>

  /** Quick reachability check used by the admin dashboard. */
  ping(): Promise<{ ok: boolean; details?: string }>
}
