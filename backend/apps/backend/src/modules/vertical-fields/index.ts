import { Module } from "@medusajs/framework/utils"
import VerticalFieldsService from "./service"

export const VERTICAL_FIELDS_MODULE = "vertical_fields"

export default Module(VERTICAL_FIELDS_MODULE, {
  service: VerticalFieldsService,
})
