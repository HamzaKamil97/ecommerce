import { Module } from "@medusajs/framework/utils"
import ApprovalService from "./service"

export const APPROVAL_MODULE = "approval"

export default Module(APPROVAL_MODULE, {
  service: ApprovalService,
})
