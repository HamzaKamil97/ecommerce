import { MedusaService } from "@medusajs/framework/utils"
import { StockPool } from "./models/stock-pool.model"
import { Movement } from "./models/movement.model"
import { StockSnapshot, WmsServiceInterface } from "./types"

class WmsServiceBase extends MedusaService({
  StockPool,
  Movement,
}) {}

export class WmsService extends WmsServiceBase implements WmsServiceInterface {
  ping(): string {
    return "wms-ok"
  }

  async getStock(vendorId: string, variantId: string): Promise<StockSnapshot> {
    const rows = await this.listStockPools({ vendor_id: vendorId, variant_id: variantId })
    if (rows.length === 0) {
      return { on_hand: 0, reserved: 0, available: 0 }
    }
    const row: any = rows[0]
    const onHand = Number(row.on_hand_qty?.numeric ?? row.on_hand_qty ?? 0)
    const reserved = Number(row.reserved_qty?.numeric ?? row.reserved_qty ?? 0)
    return { on_hand: onHand, reserved, available: onHand - reserved }
  }
}

export default WmsService
