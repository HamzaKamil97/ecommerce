import {
  createWorkflow,
  createStep,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { ADDRESSES_MODULE } from "../modules/addresses"
import { TENANT_MODULE } from "../modules/tenant"
import { ONLINE_ORDER_MODULE } from "../modules/online_order"
import { buildOnlineOrderPayload } from "./build-online-order-payload"

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
  async (input: PlaceCodInput, { container }): Promise<StepResponse<{
    order_id: string
    display_id: string
    payload_ctx: {
      vendor_id: string
      commission_rate_bps: number | null
      customer_id: string
      customer_name: string | null
      customer_phone: string | null
      currency_code: "iqd" | "usd"
      delivery_address: string | null
      lines: Array<{ variant_id: string; title: string | null; quantity: number; unit_price: number }>
    }
  }>> => {
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

    const cartItems: any[] = (cart as any).items ?? []
    const snapshotLines = cartItems.map((i: any) => ({
      variant_id: i.variant_id,
      title: i.title ?? i.product_title ?? "Item",
      quantity: i.quantity,
      unit_price: Number(i.unit_price ?? 0),
    }))
    const deliveryAddress = [address.street, address.building, address.apartment, address.city, address.region]
      .filter(Boolean).join(", ")

    // 5. Apply coupon (best effort — promotions module API varies)
    if (input.coupon_code) {
      try {
        const { updateCartPromotionsWorkflow } = await import("@medusajs/medusa/core-flows")
        if (updateCartPromotionsWorkflow) {
          await updateCartPromotionsWorkflow(container).run({
            input: { cart_id: cartId, promo_codes: [input.coupon_code] },
          }).catch(() => {})
        }
      } catch {
        // Soft-fail: order proceeds without discount if promo module API differs.
      }
    }

    // 6. Complete cart → order using completeCartWorkflow
    const { completeCartWorkflow } = await import("@medusajs/medusa/core-flows")

    try {
      const completeResult = await completeCartWorkflow(container).run({
        input: { id: cartId },
      })
      const order = completeResult.result
      const orderId = order.id
      const displayId = (order as any).display_id?.toString() ?? order.id.slice(-6).toUpperCase()

      return new StepResponse({
        order_id: orderId,
        display_id: displayId,
        payload_ctx: {
          vendor_id: shop.id,
          commission_rate_bps: shop.commission_rate_bps ?? null,
          customer_id: input.customer_id,
          customer_name: address.recipient_name ?? null,
          customer_phone: address.phone ?? null,
          currency_code: input.currency_code,
          delivery_address: deliveryAddress || null,
          lines: snapshotLines,
        },
      })
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
      const orderId = o.id
      const displayId = o.display_id?.toString() ?? o.id.slice(-6).toUpperCase()

      const fbLines = (c.items ?? []).map((i: any) => ({
        variant_id: i.variant_id, title: i.title ?? "Item",
        quantity: i.quantity, unit_price: Number(i.unit_price ?? 0),
      }))
      return new StepResponse({
        order_id: orderId,
        display_id: displayId,
        payload_ctx: {
          vendor_id: shop.id,
          commission_rate_bps: shop.commission_rate_bps ?? null,
          customer_id: input.customer_id,
          customer_name: address.recipient_name ?? null,
          customer_phone: address.phone ?? null,
          currency_code: input.currency_code,
          delivery_address: deliveryAddress || null,
          lines: fbLines,
        },
      })
    }
  }
)

const createOnlineOrderStep = createStep(
  "create-online-order",
  async (
    data: { order_id: string; display_id: string; payload_ctx: any },
    { container },
  ): Promise<StepResponse<{ online_order_id: string | null }, string | null>> => {
    const ooSvc = container.resolve(ONLINE_ORDER_MODULE) as any
    const payload = buildOnlineOrderPayload(
      { id: data.payload_ctx.vendor_id, commission_rate_bps: data.payload_ctx.commission_rate_bps },
      data.payload_ctx.lines,
      {
        customer_id: data.payload_ctx.customer_id,
        customer_name: data.payload_ctx.customer_name,
        customer_phone: data.payload_ctx.customer_phone,
        currency_code: data.payload_ctx.currency_code,
        medusa_order_id: data.order_id,
        display_id: data.display_id,
        delivery_address: data.payload_ctx.delivery_address,
      },
    )
    const row = await ooSvc.createOrder(payload)
    return new StepResponse({ online_order_id: row.id }, row.id)
  },
  // Compensation: soft-delete the online_order if a later step fails.
  async (onlineOrderId: string | null, { container }) => {
    if (!onlineOrderId) return
    const ooSvc = container.resolve(ONLINE_ORDER_MODULE) as any
    await ooSvc.deleteOnlineOrders(onlineOrderId).catch(() => {})
  },
)

export const placeCodOrderWorkflow = createWorkflow(
  "place-cod-order",
  (input: PlaceCodInput) => {
    const placed = placeStep(input)
    const oo = createOnlineOrderStep(placed)
    return new WorkflowResponse({
      order_id: placed.order_id,
      display_id: placed.display_id,
      online_order_id: oo.online_order_id,
    })
  }
)
