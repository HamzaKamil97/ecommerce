import { Module } from "@medusajs/framework/utils"
import PaymentsService from "./service"

export const PAYMENTS_MODULE = "payments"

export default Module(PAYMENTS_MODULE, {
  service: PaymentsService,
})
