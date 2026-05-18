import { Module } from "@medusajs/framework/utils"
import DeliveryService from "./service"

export const DELIVERY_MODULE = "delivery"

export default Module(DELIVERY_MODULE, {
  service: DeliveryService,
})
