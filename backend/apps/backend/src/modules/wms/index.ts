import { Module } from "@medusajs/framework/utils"
import { WmsService } from "./service"

export const WMS_MODULE = "wmsService"

export default Module(WMS_MODULE, {
  service: WmsService,
})
