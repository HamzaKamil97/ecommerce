import { Module } from "@medusajs/framework/utils"
import MerchService from "./service"

export const MERCH_MODULE = "merch"

export default Module(MERCH_MODULE, {
  service: MerchService,
})
