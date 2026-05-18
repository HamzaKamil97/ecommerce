import { MedusaService } from "@medusajs/framework/utils"
import { CustomerAddress } from "./models/customer-address"

class CustomerAddressService extends MedusaService({
  CustomerAddress,
}) {
  async listForCustomer(customerId: string) {
    return this.listDeliveryAddresses(
      { customer_id: customerId },
      { order: { is_default: "DESC", created_at: "DESC" } }
    )
  }

  async getById(id: string) {
    const [row] = await this.listDeliveryAddresses({ id })
    return row ?? null
  }

  async createForCustomer(customerId: string, data: {
    label: string
    recipient_name: string
    phone: string
    city: string
    street: string
    area?: string | null
    building?: string | null
    floor?: string | null
    notes?: string | null
    country?: string
    is_default?: boolean
  }) {
    if (data.is_default) {
      const existing = await this.listDeliveryAddresses({ customer_id: customerId, is_default: true })
      for (const e of existing) {
        await this.updateDeliveryAddresses(e.id, { is_default: false })
      }
    }
    return this.createDeliveryAddresses({
      customer_id: customerId,
      label: data.label,
      recipient_name: data.recipient_name,
      phone: data.phone,
      country: data.country ?? "IQ",
      city: data.city,
      area: data.area ?? null,
      street: data.street,
      building: data.building ?? null,
      floor: data.floor ?? null,
      notes: data.notes ?? null,
      is_default: data.is_default ?? false,
    })
  }

  async markDefault(customerId: string, id: string) {
    const target = await this.getById(id)
    if (!target || target.customer_id !== customerId) {
      throw new Error("address not found for this customer")
    }
    const others = await this.listDeliveryAddresses({
      customer_id: customerId,
      is_default: true,
    })
    for (const o of others) {
      if (o.id !== id) {
        await this.updateDeliveryAddresses(o.id, { is_default: false })
      }
    }
    await this.updateDeliveryAddresses(id, { is_default: true })
    return this.getById(id)
  }
}

export default CustomerAddressService
