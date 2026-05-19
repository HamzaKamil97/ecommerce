import {
  createWorkflow,
  createStep,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { ADDRESSES_MODULE } from "../modules/addresses"
import { TENANT_MODULE } from "../modules/tenant"

export interface PlaceCodInput {
  customer_id: string
  shop_slug: string
  region_id?: string | null
  address_id?: string | null
  inline_address?: {
    label?: string
    recipient_name?: string
    phone?: string
    street: string
    building?: string | null
    apartment?: string | null
    city: string
    region?: string | null
    country_code: string
    delivery_instructions?: string | null
    save?: boolean
    is_default?: boolean
  } | null
  items: Array<{ variant_id: string; qty: number }>
  shop_notes?: string
  delivery_notes?: string
  coupon_code?: string | null
  currency_code: "iqd" | "usd"
}

const placeStep = createStep(
  "place-cod-order",
  async (input: PlaceCodInput, { container }): Promise<StepResponse<{ order_id: string; display_id: string }>> => {
    const tenantSvc = container.resolve(TENANT_MODULE) as any
    const addrSvc = container.resolve(ADDRESSES_MODULE) as any

    // 1. Resolve shop
    const shop = await tenantSvc.getBySlug(input.shop_slug)
    if (!shop) throw new Error(`Shop "${input.shop_slug}" not found`)
    if (!shop.sales_channel_id) throw new Error(`Shop ${input.shop_slug} has no sales channel`)

    // 2. Resolve address — saved by id, or use/save the inline form
    let address: any
    if (input.address_id) {
      const [row] = await addrSvc.listCustomerAddresses({ id: input.address_id })
      if (!row || row.customer_id !== input.customer_id) {
        throw new Error("address not found for this customer")
      }
      address = row
    } else if (input.inline_address) {
      const a = input.inline_address
      if (a.save) {
        address = await addrSvc.createForCustomer(input.customer_id, {
          label: a.label ?? "Home",
          recipient_name: a.recipient_name,
          phone: a.phone,
          street: a.street,
          building: a.building ?? null,
          apartment: a.apartment ?? null,
          city: a.city,
          region: a.region ?? null,
          country_code: a.country_code,
          delivery_instructions: a.delivery_instructions ?? null,
          is_default: a.is_default ?? false,
        })
      } else {
        address = { ...a }
      }
    } else {
      throw new Error("address_id or inline_address required")
    }

    // 3. Build shipping address shape for createCartWorkflow
    const shippingAddress = {
      first_name: address.recipient_name ?? "Customer",
      last_name: "",
      phone: address.phone ?? "",
      country_code: (address.country_code ?? "IQ").toLowerCase(),
      city: address.city,
      address_1: address.street,
      address_2: [address.building, address.apartment].filter(Boolean).join(", ") || undefined,
      postal_code: address.postcode ?? "00000",
      province: address.region ?? undefined,
    }

    // 4. Use createCartWorkflow — it handles variant price resolution automatically
    const { createCartWorkflow } = await import("@medusajs/medusa/core-flows")
    const createCartResult = await createCartWorkflow(container).run({
      input: {
        sales_channel_id: shop.sales_channel_id,
        customer_id: input.customer_id,
        currency_code: input.currency_code,
        ...(input.region_id ? { region_id: input.region_id } : {}),
        shipping_address: shippingAddress,
        metadata: {
          shop_slug: input.shop_slug,
          shop_notes: input.shop_notes ?? "",
          delivery_notes: input.delivery_notes ?? "",
          coupon_code: input.coupon_code ?? null,
        },
        // items passed at creation — createCartWorkflow resolves variant prices
        items: input.items.map((it) => ({
          variant_id: it.variant_id,
          quantity: it.qty,
        })),
      },
    })

    const cart = createCartResult.result
    const cartId = cart.id

    // 5. Apply coupon (best effort — promotions module API varies)
    if (input.coupon_code) {
      try {
        const { updateCartPromotionsWorkflow } = await import("@medusajs/medusa/core-flows")
        if (updateCartPromotionsWorkflow) {
          await updateCartPromotionsWorkflow(container).run({
            input: { id: cartId, promo_codes: [input.coupon_code] },
          }).catch(() => {})
        }
      } catch {
        // Soft-fail: order proceeds without discount if promo module API differs.
      }
    }

    // 6. Complete cart → order using completeCartWorkflow
    const { completeCartWorkflow } = await import("@medusajs/medusa/core-flows")
    let orderId: string
    let displayId: string

    try {
      const completeResult = await completeCartWorkflow(container).run({
        input: { id: cartId },
      })
      const order = completeResult.result
      orderId = order.id
      displayId = (order as any).display_id?.toString() ?? order.id.slice(-6).toUpperCase()
    } catch {
      // Fallback: build the order directly via orderSvc
      const { Modules } = await import("@medusajs/framework/utils")
      const cartSvc = container.resolve(Modules.CART) as any
      const orderSvc = container.resolve(Modules.ORDER) as any

      const c = await cartSvc.retrieveCart(cartId, { relations: ["items"] })
      const [o] = await orderSvc.createOrders([{
        customer_id: input.customer_id,
        sales_channel_id: shop.sales_channel_id,
        currency_code: input.currency_code,
        items: (c.items ?? []).map((i: any) => ({
          variant_id: i.variant_id,
          title: i.title ?? "Item",
          quantity: i.quantity,
          unit_price: i.unit_price ?? 0,
        })),
        shipping_address: c.shipping_address,
        metadata: c.metadata,
        status: "pending",
      }])
      orderId = o.id
      displayId = o.display_id?.toString() ?? o.id.slice(-6).toUpperCase()
    }

    return new StepResponse({ order_id: orderId, display_id: displayId })
  }
)

export const placeCodOrderWorkflow = createWorkflow(
  "place-cod-order",
  (input: PlaceCodInput) => {
    const out = placeStep(input)
    return new WorkflowResponse(out)
  }
)
