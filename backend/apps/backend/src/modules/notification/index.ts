import { Module } from "@medusajs/framework/utils"
import NotificationService from "./service"

export const NOTIFICATION_MODULE = "notification_center"  // avoid clash with Medusa's built-in "notification"

export default Module(NOTIFICATION_MODULE, {
  service: NotificationService,
})
