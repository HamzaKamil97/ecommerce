import { Module } from "@medusajs/framework/utils"
import CustomerAddressService from "./service"

// Module key uses "cust_addr" to avoid clashing with Medusa's built-in
// customer_address alias (which the framework registers on the customer service).
// The DB table is still named "customer_address" (set in the model).
export const CUSTOMER_ADDRESS_MODULE = "cust_addr"

export default Module(CUSTOMER_ADDRESS_MODULE, {
  service: CustomerAddressService,
})
