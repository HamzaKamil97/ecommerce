import { Module } from "@medusajs/framework/utils"
import AddressesService from "./service"

export const ADDRESSES_MODULE = "addresses"

export default Module(ADDRESSES_MODULE, {
  service: AddressesService,
})
