import { WmsServiceInterface } from "./types"

export class WmsService implements WmsServiceInterface {
  ping(): string {
    return "wms-ok"
  }
}

export default WmsService
