import { MedusaService } from "@medusajs/framework/utils"
import { StockPool } from "./models/stock-pool.model"
import { WmsServiceInterface } from "./types"

class WmsServiceBase extends MedusaService({
  StockPool,
}) {}

export class WmsService extends WmsServiceBase implements WmsServiceInterface {
  ping(): string {
    return "wms-ok"
  }
}

export default WmsService
