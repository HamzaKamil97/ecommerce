import { Module } from "@medusajs/framework/utils"
import PromotionsService from "./service"

export const PROMOTIONS_MODULE = "promotions"

export default Module(PROMOTIONS_MODULE, {
  service: PromotionsService,
})
