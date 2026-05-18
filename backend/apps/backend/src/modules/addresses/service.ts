import { MedusaService } from "@medusajs/framework/utils"
import { CustomerAddress } from "./models/customer-address"

class AddressesService extends MedusaService({
  CustomerAddress,
}) {
  async listForCustomer(customerId: string) {
    return this.listCustomerAddresses({ customer_id: customerId })
  }

  async setDefault(addressId: string, customerId: string) {
    // Clear other defaults
    const all = await this.listCustomerAddresses({ customer_id: customerId, is_default: true })
    for (const a of all) {
      if (a.id !== addressId) {
        await (this as any).updateCustomerAddresses({ id: a.id, is_default: false })
      }
    }
    return (this as any).updateCustomerAddresses({ id: addressId, is_default: true })
  }
}

export default AddressesService
