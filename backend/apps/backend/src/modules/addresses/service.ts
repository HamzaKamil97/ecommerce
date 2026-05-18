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

  async createForCustomer(customerId: string, data: {
    label?: string
    recipient_name?: string
    phone?: string
    street: string
    building?: string | null
    apartment?: string | null
    city: string
    region?: string | null
    postcode?: string | null
    country_code: string
    delivery_instructions?: string | null
    is_default?: boolean
    lat?: number | null
    lng?: number | null
  }) {
    if (data.is_default) {
      const existing = await this.listCustomerAddresses({ customer_id: customerId, is_default: true })
      for (const e of existing) {
        await (this as any).updateCustomerAddresses({ id: e.id, is_default: false })
      }
    }
    return (this as any).createCustomerAddresses({ ...data, customer_id: customerId })
  }
}

export default AddressesService
