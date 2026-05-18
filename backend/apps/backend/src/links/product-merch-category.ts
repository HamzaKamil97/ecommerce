import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import MerchModule from "../modules/merch"

export default defineLink(
  ProductModule.linkable.product,
  {
    linkable: MerchModule.linkable.merchCategory,
    isList: true,
  }
)
