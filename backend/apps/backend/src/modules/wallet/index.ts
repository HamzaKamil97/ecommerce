import { Module } from "@medusajs/framework/utils"
import WalletService from "./service"

export const WALLET_MODULE = "wallet"

export default Module(WALLET_MODULE, {
  service: WalletService,
})
