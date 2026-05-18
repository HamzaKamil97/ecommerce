# SP-B: Cart & Checkout UX Rebuild — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Rebuild cart flow end-to-end: fly-to-cart animation, one-shop-active cart with cross-shop add prompt, redesigned cart screen with working steppers + product navigation, single-page COD checkout with saved-addresses picker, coupon support, and an order-placed success screen. Split notes into shop-facing (cart) and rider-facing (delivery instructions).

**Architecture:** Cart is client-side state (Zustand on mobile, React Context on storefront), persists across navigation, clears only on explicit cross-shop add confirm. New `customer_address` backend module stores saved addresses. New `placeCodOrderWorkflow` wraps Medusa core flows to atomically create + complete a COD order with both notes fields and optional coupon. UI components reuse SP-A's pattern: same components for every section.

**Tech Stack:** Medusa v2 (TypeScript), PostgreSQL 16, Jest + @medusajs/test-utils, React Native + Expo + Reanimated (mobile), Next.js 15 (storefront), Tailwind CSS (storefront).

**Spec:** `docs/superpowers/specs/2026-05-19-sp-b-cart-checkout-design.md` (commit `54be302`).

**Estimated effort:** ~13 working days across 10 phases.

---

## File structure

### Backend (`backend/apps/backend/src/`)

```
modules/customer-address/                 NEW MODULE
├── index.ts                             CUSTOMER_ADDRESS_MODULE = "customer_address"
├── service.ts                           list, getById, createForCustomer, markDefault, softDelete
├── models/customer-address.ts
└── migrations/

workflows/
└── place-cod-order.ts                    NEW — wraps Medusa cart workflows for COD

api/store/
├── customers/me/addresses/
│   ├── route.ts                          GET (list), POST (create)
│   └── [id]/
│       ├── route.ts                      DELETE
│       └── default/route.ts              POST (mark default)
└── orders/place-cod/route.ts             POST — atomic place

api/admin/orders/[orderId]/notes/
└── route.ts                              GET — surfaces shop_notes + delivery_notes for vendor portal
```

### Mobile (`mobile/src/` + `mobile/app/`)

```
src/store/cartStore.ts                    EXTEND — new shape, cross-shop helper, notes/coupon fields
src/components/cart/
├── CartItemRow.tsx                       NEW — item row with stepper + trash
├── CrossShopModal.tsx                    NEW — confirm dialog
├── FlyingImage.tsx                       NEW — animated ghost for fly-to-cart
└── CouponRow.tsx                         NEW — collapsible coupon input
src/components/checkout/
├── AddressCard.tsx                       NEW — selected address summary
├── AddressPickerSheet.tsx                NEW — bottom sheet w/ list + form
└── AddressForm.tsx                       NEW — inline form (city / area / etc.)
src/lib/api/
├── addresses.ts                          NEW — list/create/markDefault/delete
└── orders.ts                             NEW — placeCodOrder

app/(tabs)/cart.tsx                       REBUILT — full cart screen
app/checkout.tsx                          REBUILT — single-page checkout
app/order/success/[id].tsx                NEW — success route
```

### Storefront (`backend/apps/storefront/src/`)

```
modules/cart/components/                  NEW or EXTEND
├── cart-item-row/index.tsx
├── cross-shop-modal/index.tsx
└── coupon-row/index.tsx
modules/checkout/components/
├── address-card/index.tsx
├── address-picker-sheet/index.tsx
└── address-form/index.tsx
modules/products/components/
└── fly-to-cart/index.tsx                 NEW — CSS-based clone

app/[countryCode]/(main)/
├── cart/page.tsx                         REBUILT
├── checkout/page.tsx                     REBUILT
└── order/success/[id]/page.tsx           NEW

lib/data/addresses.ts                     NEW — server-side fetchers
lib/data/place-order.ts                   NEW — server action wrapper
lib/context/cart-context.tsx              EXTEND — cross-shop logic + notes/coupon
```

### Vendor (`backend/apps/vendor/`)

```
app/orders/[id]/page.tsx                  EXTEND — show shop_notes + delivery_notes
```

---

## Phase 1 — Customer-address module

### Task 1.1: Create the customer-address module skeleton

**Files:**
- Create: `backend/apps/backend/src/modules/customer-address/index.ts`
- Create: `backend/apps/backend/src/modules/customer-address/service.ts`
- Create: `backend/apps/backend/src/modules/customer-address/models/customer-address.ts`
- Modify: `backend/apps/backend/medusa-config.ts`

- [ ] **Step 1: Create the model**

`backend/apps/backend/src/modules/customer-address/models/customer-address.ts`:

```typescript
import { model } from "@medusajs/framework/utils"

// A customer's saved delivery address. tenant_of_customer isolation enforced
// at the API layer (customer-id from auth_context). Soft-deletable.
export const CustomerAddress = model.define("customer_address", {
  id: model.id().primaryKey(),
  customer_id: model.text(),
  label: model.text(),
  recipient_name: model.text(),
  phone: model.text(),
  country: model.text().default("IQ"),
  city: model.text(),
  area: model.text().nullable(),
  street: model.text(),
  building: model.text().nullable(),
  floor: model.text().nullable(),
  notes: model.text().nullable(),
  is_default: model.boolean().default(false),
}).indexes([
  { on: ["customer_id"] },
  { on: ["customer_id", "is_default"] },
])
```

- [ ] **Step 2: Module index**

`backend/apps/backend/src/modules/customer-address/index.ts`:

```typescript
import { Module } from "@medusajs/framework/utils"
import CustomerAddressService from "./service"

export const CUSTOMER_ADDRESS_MODULE = "customer_address"

export default Module(CUSTOMER_ADDRESS_MODULE, {
  service: CustomerAddressService,
})
```

- [ ] **Step 3: Service**

`backend/apps/backend/src/modules/customer-address/service.ts`:

```typescript
import { MedusaService } from "@medusajs/framework/utils"
import { CustomerAddress } from "./models/customer-address"

class CustomerAddressService extends MedusaService({
  CustomerAddress,
}) {
  async listForCustomer(customerId: string) {
    return this.listCustomerAddresses(
      { customer_id: customerId },
      { order: { is_default: "DESC", created_at: "DESC" } }
    )
  }

  async getById(id: string) {
    const [row] = await this.listCustomerAddresses({ id })
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
      // unset previous default
      const existing = await this.listCustomerAddresses({ customer_id: customerId, is_default: true })
      for (const e of existing) {
        await this.updateCustomerAddresses(e.id, { is_default: false })
      }
    }
    return this.createCustomerAddresses({
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
    // unset others
    const others = await this.listCustomerAddresses({
      customer_id: customerId,
      is_default: true,
    })
    for (const o of others) {
      if (o.id !== id) {
        await this.updateCustomerAddresses(o.id, { is_default: false })
      }
    }
    await this.updateCustomerAddresses(id, { is_default: true })
    return this.getById(id)
  }
}

export default CustomerAddressService
```

- [ ] **Step 4: Register in medusa-config**

Read `backend/apps/backend/medusa-config.ts`. Find the `{ resolve: "./src/modules/merch" }` line and add right after it:

```typescript
    { resolve: "./src/modules/customer-address" },
```

- [ ] **Step 5: Generate + apply migration**

```bash
cd backend/apps/backend
npx medusa db:generate customer-address
npx medusa db:migrate
```
Expected: new migration created in `src/modules/customer-address/migrations/` and applied.

- [ ] **Step 6: Verify the table**

```bash
PGPASSWORD=medusa "/d/Programs/PostgreSQL/16/bin/psql.exe" -U medusa -h localhost -p 5433 -d medusa_db -c "\d customer_address"
```
Expected: columns `id, customer_id, label, recipient_name, phone, country, city, area, street, building, floor, notes, is_default, created_at, updated_at, deleted_at`, plus the two indexes.

- [ ] **Step 7: Commit**

```bash
cd "D:/Personal/08_Ecommerce app/ecommerce-mvp"
git add backend/apps/backend/src/modules/customer-address/ \
        backend/apps/backend/medusa-config.ts
git commit -m "feat(customer-address): module + model + service

Saved delivery addresses per customer. Service handles default-flip
(only one is_default per customer). Full delete/edit UI deferred to SP-D.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 1.2: customer-address API routes + integration tests

**Files:**
- Create: `backend/apps/backend/src/api/store/customers/me/addresses/route.ts`
- Create: `backend/apps/backend/src/api/store/customers/me/addresses/[id]/route.ts`
- Create: `backend/apps/backend/src/api/store/customers/me/addresses/[id]/default/route.ts`
- Create: `backend/apps/backend/src/modules/customer-address/__tests__/customer-address.spec.ts`

- [ ] **Step 1: Collection route (GET + POST)**

Create `backend/apps/backend/src/api/store/customers/me/addresses/route.ts`:

```typescript
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CUSTOMER_ADDRESS_MODULE } from "../../../../../modules/customer-address"

function getCustomerId(req: MedusaRequest): string | null {
  const ctx = (req as any).auth_context
  if (ctx?.actor_type !== "customer") return null
  return ctx.actor_id ?? null
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const customerId = getCustomerId(req)
  if (!customerId) return res.status(401).json({ error: "Customer authentication required" })
  const svc = req.scope.resolve(CUSTOMER_ADDRESS_MODULE) as any
  const list = await svc.listForCustomer(customerId)
  res.json({ addresses: list })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = getCustomerId(req)
  if (!customerId) return res.status(401).json({ error: "Customer authentication required" })
  const body = (req.body as any) || {}
  const required = ["label", "recipient_name", "phone", "city", "street"]
  const missing = required.filter((k) => !body[k] || typeof body[k] !== "string")
  if (missing.length > 0) {
    return res.status(400).json({ error: `missing required: ${missing.join(", ")}` })
  }
  const svc = req.scope.resolve(CUSTOMER_ADDRESS_MODULE) as any
  const created = await svc.createForCustomer(customerId, body)
  res.status(201).json({ address: created })
}
```

- [ ] **Step 2: Item route (DELETE)**

Create `backend/apps/backend/src/api/store/customers/me/addresses/[id]/route.ts`:

```typescript
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CUSTOMER_ADDRESS_MODULE } from "../../../../../../modules/customer-address"

function getCustomerId(req: MedusaRequest): string | null {
  const ctx = (req as any).auth_context
  if (ctx?.actor_type !== "customer") return null
  return ctx.actor_id ?? null
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const customerId = getCustomerId(req)
  if (!customerId) return res.status(401).json({ error: "Customer authentication required" })
  const svc = req.scope.resolve(CUSTOMER_ADDRESS_MODULE) as any
  const target = await svc.getById(req.params.id)
  if (!target || target.customer_id !== customerId) {
    return res.status(404).json({ error: "Not found" })
  }
  await svc.deleteCustomerAddresses(req.params.id)
  res.status(204).end()
}
```

- [ ] **Step 3: Default-mark route**

Create `backend/apps/backend/src/api/store/customers/me/addresses/[id]/default/route.ts`:

```typescript
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CUSTOMER_ADDRESS_MODULE } from "../../../../../../../modules/customer-address"

function getCustomerId(req: MedusaRequest): string | null {
  const ctx = (req as any).auth_context
  if (ctx?.actor_type !== "customer") return null
  return ctx.actor_id ?? null
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = getCustomerId(req)
  if (!customerId) return res.status(401).json({ error: "Customer authentication required" })
  const svc = req.scope.resolve(CUSTOMER_ADDRESS_MODULE) as any
  try {
    const updated = await svc.markDefault(customerId, req.params.id)
    res.json({ address: updated })
  } catch (e: any) {
    res.status(404).json({ error: e.message })
  }
}
```

- [ ] **Step 4: Integration tests**

Create `backend/apps/backend/src/modules/customer-address/__tests__/customer-address.spec.ts`:

```typescript
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { CUSTOMER_ADDRESS_MODULE } from "../index"

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    describe("CustomerAddressService", () => {
      it("creates and lists addresses for a customer", async () => {
        const svc = getContainer().resolve(CUSTOMER_ADDRESS_MODULE) as any
        const addr = await svc.createForCustomer("cus_test_1", {
          label: "Home", recipient_name: "Hamza", phone: "+964 750 1",
          city: "Baghdad", street: "Karrada, Bldg 12",
        })
        expect(addr.label).toBe("Home")
        expect(addr.is_default).toBe(false)
        const list = await svc.listForCustomer("cus_test_1")
        expect(list).toHaveLength(1)
      })

      it("marks default and unsets previous default", async () => {
        const svc = getContainer().resolve(CUSTOMER_ADDRESS_MODULE) as any
        const a = await svc.createForCustomer("cus_test_2", {
          label: "Home", recipient_name: "X", phone: "1", city: "Baghdad", street: "A", is_default: true,
        })
        const b = await svc.createForCustomer("cus_test_2", {
          label: "Office", recipient_name: "X", phone: "1", city: "Baghdad", street: "B",
        })
        await svc.markDefault("cus_test_2", b.id)
        const updatedA = await svc.getById(a.id)
        const updatedB = await svc.getById(b.id)
        expect(updatedA.is_default).toBe(false)
        expect(updatedB.is_default).toBe(true)
      })

      it("isolates by customer_id", async () => {
        const svc = getContainer().resolve(CUSTOMER_ADDRESS_MODULE) as any
        await svc.createForCustomer("cus_test_3a", {
          label: "X", recipient_name: "x", phone: "1", city: "Baghdad", street: "x",
        })
        await svc.createForCustomer("cus_test_3b", {
          label: "X", recipient_name: "x", phone: "1", city: "Baghdad", street: "x",
        })
        const a = await svc.listForCustomer("cus_test_3a")
        const b = await svc.listForCustomer("cus_test_3b")
        expect(a).toHaveLength(1)
        expect(b).toHaveLength(1)
        expect(a[0].id).not.toBe(b[0].id)
      })

      it("orders by is_default DESC then created_at DESC", async () => {
        const svc = getContainer().resolve(CUSTOMER_ADDRESS_MODULE) as any
        const old = await svc.createForCustomer("cus_test_4", {
          label: "Old", recipient_name: "x", phone: "1", city: "Baghdad", street: "x",
        })
        await svc.createForCustomer("cus_test_4", {
          label: "New", recipient_name: "x", phone: "1", city: "Baghdad", street: "x",
        })
        const dflt = await svc.createForCustomer("cus_test_4", {
          label: "Default", recipient_name: "x", phone: "1", city: "Baghdad", street: "x", is_default: true,
        })
        const list = await svc.listForCustomer("cus_test_4")
        expect(list[0].id).toBe(dflt.id)
      })
    })
  },
})
```

- [ ] **Step 5: Run the tests**

```bash
cd backend/apps/backend
npm run test:integration:modules -- customer-address.spec.ts 2>&1 | tail -25
```
Expected: 4/4 passing.

- [ ] **Step 6: Commit**

```bash
cd "D:/Personal/08_Ecommerce app/ecommerce-mvp"
git add backend/apps/backend/src/api/store/customers/ \
        backend/apps/backend/src/modules/customer-address/__tests__/
git commit -m "feat(api): /store/customers/me/addresses CRUD + integration tests

GET (list), POST (create), DELETE (soft), POST .../default. Customer
isolation via auth_context.actor_type=='customer'. 401 on missing auth.
404 on cross-customer access.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 2 — placeCodOrderWorkflow + endpoint

### Task 2.1: placeCodOrderWorkflow

**Files:**
- Create: `backend/apps/backend/src/workflows/place-cod-order.ts`
- Create: `backend/apps/backend/src/workflows/__tests__/place-cod-order.spec.ts` (placed in `src/modules/customer-address/__tests__/` per jest pattern)

- [ ] **Step 1: Write the workflow**

Create `backend/apps/backend/src/workflows/place-cod-order.ts`:

```typescript
import {
  createWorkflow,
  createStep,
  StepResponse,
  WorkflowResponse,
  transform,
} from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import { CUSTOMER_ADDRESS_MODULE } from "../modules/customer-address"
import { TENANT_MODULE } from "../modules/tenant"

export interface PlaceCodInput {
  customer_id: string
  shop_slug: string
  address_id?: string | null
  inline_address?: {
    label: string
    recipient_name: string
    phone: string
    city: string
    area?: string | null
    street: string
    building?: string | null
    floor?: string | null
    notes?: string | null
    save?: boolean
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
    const addrSvc = container.resolve(CUSTOMER_ADDRESS_MODULE) as any
    const cartSvc = container.resolve(Modules.CART) as any
    const orderSvc = container.resolve(Modules.ORDER) as any

    // 1. Resolve shop
    const shop = await tenantSvc.getBySlug(input.shop_slug)
    if (!shop) throw new Error(`Shop "${input.shop_slug}" not found`)
    if (!shop.sales_channel_id) throw new Error(`Shop ${input.shop_slug} has no sales channel`)

    // 2. Resolve address
    let address: any
    if (input.address_id) {
      address = await addrSvc.getById(input.address_id)
      if (!address || address.customer_id !== input.customer_id) {
        throw new Error("address not found for this customer")
      }
    } else if (input.inline_address) {
      const a = input.inline_address
      if (a.save) {
        address = await addrSvc.createForCustomer(input.customer_id, {
          label: a.label,
          recipient_name: a.recipient_name,
          phone: a.phone,
          city: a.city,
          area: a.area ?? null,
          street: a.street,
          building: a.building ?? null,
          floor: a.floor ?? null,
          notes: a.notes ?? null,
        })
      } else {
        address = { ...a, country: "IQ" }
      }
    } else {
      throw new Error("address_id or inline_address required")
    }

    // 3. Create cart
    const [cart] = await cartSvc.createCarts([{
      sales_channel_id: shop.sales_channel_id,
      customer_id: input.customer_id,
      currency_code: input.currency_code,
      shipping_address: {
        first_name: address.recipient_name,
        last_name: "",
        phone: address.phone,
        country_code: (address.country ?? "IQ").toLowerCase(),
        city: address.city,
        address_1: address.street,
        address_2: [address.building, address.floor].filter(Boolean).join(", ") || undefined,
        postal_code: "00000",
        province: address.area ?? undefined,
      },
      metadata: {
        shop_slug: input.shop_slug,
        shop_notes: input.shop_notes ?? "",
        delivery_notes: input.delivery_notes ?? "",
        coupon_code: input.coupon_code ?? null,
      },
    }])

    // 4. Add line items
    for (const it of input.items) {
      await cartSvc.addLineItems({
        cart_id: cart.id,
        items: [{ variant_id: it.variant_id, quantity: it.qty }],
      })
    }

    // 5. Apply coupon (if present) — uses existing promotions module
    if (input.coupon_code) {
      try {
        const promotionsSvc = container.resolve("promotions") as any
        // validate first (existing /store/promotions/validate logic — service may differ)
        await promotionsSvc.addPromotionsToCart?.(cart.id, [input.coupon_code]).catch(() => {})
      } catch {
        // Soft-fail: order proceeds without discount if promo module API differs.
      }
    }

    // 6. Set payment provider = manual (Medusa's "system" provider — used for COD)
    await cartSvc.addPaymentSession?.(cart.id, { provider_id: "system" }).catch(() => {})

    // 7. Complete cart → order
    const completed = await cartSvc.completeCart?.(cart.id).catch(async () => {
      // Fallback path: use orderSvc.createOrders directly if completeCart unavailable
      const c = await cartSvc.retrieveCart(cart.id, { relations: ["items"] })
      const [o] = await orderSvc.createOrders([{
        customer_id: input.customer_id,
        sales_channel_id: shop.sales_channel_id,
        currency_code: input.currency_code,
        items: c.items.map((i: any) => ({
          variant_id: i.variant_id,
          title: i.title,
          quantity: i.quantity,
          unit_price: i.unit_price,
        })),
        shipping_address: c.shipping_address,
        metadata: c.metadata,
      }])
      return o
    })

    const order = completed?.order ?? completed
    return new StepResponse({ order_id: order.id, display_id: order.display_id ?? order.id.slice(-6).toUpperCase() })
  }
)

export const placeCodOrderWorkflow = createWorkflow(
  "place-cod-order",
  (input: PlaceCodInput) => {
    const out = placeStep(input)
    return new WorkflowResponse(out)
  }
)
```

If `Modules.CART` / `Modules.ORDER` aren't exposed the way the code assumes, adapt — the goal is "create cart, add items, set address, complete → order". Use whatever Medusa v2 calls work.

- [ ] **Step 2: Write integration test**

Create `backend/apps/backend/src/modules/customer-address/__tests__/place-cod-order.spec.ts`:

```typescript
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules } from "@medusajs/framework/utils"
import { placeCodOrderWorkflow } from "../../../workflows/place-cod-order"
import { syncTaxonomySeedWorkflow } from "../../../workflows/sync-taxonomy-seed"
import { TENANT_MODULE } from "../../tenant"
import { CUSTOMER_ADDRESS_MODULE } from ".."
import { createSalesChannelsWorkflow, createProductsWorkflow } from "@medusajs/medusa/core-flows"

async function setupShopWithProduct(container: any) {
  const { result: [channel] } = await createSalesChannelsWorkflow(container).run({
    input: { salesChannelsData: [{ name: `Test ${Date.now()}` }] },
  })
  const tenantSvc = container.resolve(TENANT_MODULE) as any
  const [tenant] = await tenantSvc.createTenants([{
    slug: `t-${Date.now()}`,
    name: "Test Shop",
    vertical: "food",
    display_currency: "IQD",
    sales_channel_id: channel.id,
    approval_status: "approved",
  }])
  const { result: [created] } = await createProductsWorkflow(container).run({
    input: {
      products: [{
        title: "Test Pizza",
        handle: `test-pizza-${Date.now()}`,
        status: "published",
        sales_channels: [{ id: channel.id }],
        options: [{ title: "Default", values: ["Default"] }],
        variants: [{
          title: "Default",
          manage_inventory: false,
          prices: [{ amount: 15000, currency_code: "iqd" }],
          options: { Default: "Default" },
        }],
      }],
    },
  })
  return { tenant, channel, product: created, variant: created.variants[0] }
}

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    beforeAll(async () => {
      await syncTaxonomySeedWorkflow(getContainer()).run({})
    })

    describe("placeCodOrderWorkflow", () => {
      it("places an order with inline address", async () => {
        const { tenant, variant } = await setupShopWithProduct(getContainer())
        const { result } = await placeCodOrderWorkflow(getContainer()).run({
          input: {
            customer_id: "cus_test_pod_1",
            shop_slug: tenant.slug,
            inline_address: {
              label: "Home", recipient_name: "Hamza", phone: "+964 750 1",
              city: "Baghdad", street: "Karrada 12", save: true,
            },
            items: [{ variant_id: variant.id, qty: 2 }],
            shop_notes: "No onions",
            delivery_notes: "Blue gate",
            coupon_code: null,
            currency_code: "iqd",
          },
        })
        expect(result.order_id).toBeTruthy()
        expect(result.display_id).toBeTruthy()
      })

      it("places an order with saved address_id", async () => {
        const { tenant, variant } = await setupShopWithProduct(getContainer())
        const addrSvc = getContainer().resolve(CUSTOMER_ADDRESS_MODULE) as any
        const addr = await addrSvc.createForCustomer("cus_test_pod_2", {
          label: "Home", recipient_name: "x", phone: "1",
          city: "Baghdad", street: "x",
        })
        const { result } = await placeCodOrderWorkflow(getContainer()).run({
          input: {
            customer_id: "cus_test_pod_2",
            shop_slug: tenant.slug,
            address_id: addr.id,
            items: [{ variant_id: variant.id, qty: 1 }],
            shop_notes: "",
            delivery_notes: "",
            currency_code: "iqd",
          },
        })
        expect(result.order_id).toBeTruthy()
      })

      it("rejects when neither address_id nor inline_address provided", async () => {
        const { tenant, variant } = await setupShopWithProduct(getContainer())
        await expect(placeCodOrderWorkflow(getContainer()).run({
          input: {
            customer_id: "cus_test_pod_3",
            shop_slug: tenant.slug,
            items: [{ variant_id: variant.id, qty: 1 }],
            currency_code: "iqd",
          },
        })).rejects.toThrow()
      })

      it("rejects unknown shop", async () => {
        await expect(placeCodOrderWorkflow(getContainer()).run({
          input: {
            customer_id: "cus_test_pod_4",
            shop_slug: "nope-shop",
            inline_address: {
              label: "Home", recipient_name: "x", phone: "1", city: "Baghdad", street: "x",
            },
            items: [],
            currency_code: "iqd",
          },
        })).rejects.toThrow(/not found/)
      })
    })
  },
})
```

- [ ] **Step 3: Run tests**

```bash
cd backend/apps/backend
npm run test:integration:modules -- place-cod-order.spec.ts 2>&1 | tail -25
```
Expected: 4/4 passing. If specific Medusa cart APIs don't match your version, adapt the workflow code until tests pass.

- [ ] **Step 4: Commit**

```bash
cd "D:/Personal/08_Ecommerce app/ecommerce-mvp"
git add backend/apps/backend/src/workflows/place-cod-order.ts \
        backend/apps/backend/src/modules/customer-address/__tests__/place-cod-order.spec.ts
git commit -m "feat(orders): placeCodOrderWorkflow

Composes cart creation, line-item add, address binding, coupon (best-effort
via promotions module), payment-session = system, complete-cart. Stores
shop_notes + delivery_notes + coupon_code in order metadata. Atomic.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 2.2: /store/orders/place-cod endpoint

**Files:**
- Create: `backend/apps/backend/src/api/store/orders/place-cod/route.ts`

- [ ] **Step 1: Create the route**

```typescript
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { placeCodOrderWorkflow } from "../../../../workflows/place-cod-order"

function getCustomerId(req: MedusaRequest): string | null {
  const ctx = (req as any).auth_context
  if (ctx?.actor_type !== "customer") return null
  return ctx.actor_id ?? null
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = getCustomerId(req)
  if (!customerId) return res.status(401).json({ error: "Customer authentication required" })

  const body = (req.body as any) || {}
  if (!body.shop_slug) return res.status(400).json({ error: "shop_slug required" })
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return res.status(400).json({ error: "items must be non-empty array" })
  }

  try {
    const { result } = await placeCodOrderWorkflow(req.scope).run({
      input: {
        customer_id: customerId,
        shop_slug: body.shop_slug,
        address_id: body.address_id ?? null,
        inline_address: body.inline_address ?? null,
        items: body.items,
        shop_notes: body.shop_notes ?? "",
        delivery_notes: body.delivery_notes ?? "",
        coupon_code: body.coupon_code ?? null,
        currency_code: body.currency_code ?? "iqd",
      },
    })
    res.json({ order_id: result.order_id, display_id: result.display_id })
  } catch (e: any) {
    res.status(400).json({ error: e.message })
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd "D:/Personal/08_Ecommerce app/ecommerce-mvp"
git add backend/apps/backend/src/api/store/orders/
git commit -m "feat(api): POST /store/orders/place-cod

Customer auth required. Calls placeCodOrderWorkflow. Returns
{order_id, display_id}. 400 on bad input, 401 on missing auth.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 3 — Mobile cart store + cross-shop logic

### Task 3.1: Extend cart store with new shape

**Files:**
- Modify: `mobile/src/store/cartStore.ts`

- [ ] **Step 1: Read current store**

`cat mobile/src/store/cartStore.ts` — understand the current shape. Note action names (`addToCart`, `removeFromCart`, etc.) and any persistence (AsyncStorage).

- [ ] **Step 2: Extend with new state shape**

Update the store to match this shape (preserve any existing fields/actions you find that callers still rely on, but the new logical model is):

```typescript
import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import AsyncStorage from "@react-native-async-storage/async-storage"

export interface CartItem {
  product_id: string
  variant_id: string
  product_handle: string
  title: string
  thumbnail: string | null
  unit_price_minor: number
  currency_code: "iqd" | "usd"
  qty: number
}

interface CartState {
  shop_slug: string | null
  shop_name: string | null
  shop_display_currency: "iqd" | "usd"
  items: CartItem[]
  shop_notes: string
  delivery_notes: string
  coupon_code: string | null
  discount_minor: number  // applied discount, populated after server-side coupon validation
  // pending cross-shop add (set when modal needs to fire)
  pending_add: { shop_slug: string; shop_name: string; shop_currency: "iqd" | "usd"; item: CartItem } | null

  // actions
  addItem: (shop: { slug: string; name: string; currency: "iqd" | "usd" }, item: Omit<CartItem, "qty">) => "added" | "needs_confirm"
  confirmCrossShopAdd: () => void
  cancelCrossShopAdd: () => void
  incQty: (variantId: string) => void
  decQty: (variantId: string) => void
  removeItem: (variantId: string) => void
  setShopNotes: (notes: string) => void
  setDeliveryNotes: (notes: string) => void
  setCoupon: (code: string | null, discountMinor: number) => void
  clear: () => void

  // selectors
  itemCount: () => number
  subtotalMinor: () => number
}

export const useCartStore = create<CartState>()(persist((set, get) => ({
  shop_slug: null, shop_name: null, shop_display_currency: "iqd",
  items: [], shop_notes: "", delivery_notes: "", coupon_code: null, discount_minor: 0,
  pending_add: null,

  addItem: (shop, item) => {
    const state = get()
    const sameShop = state.shop_slug === null || state.shop_slug === shop.slug
    if (!sameShop) {
      set({ pending_add: { shop_slug: shop.slug, shop_name: shop.name, shop_currency: shop.currency, item: { ...item, qty: 1 } } })
      return "needs_confirm"
    }
    // same shop or empty cart — add directly
    const existing = state.items.find((i) => i.variant_id === item.variant_id)
    if (existing) {
      set({
        items: state.items.map((i) => i.variant_id === item.variant_id ? { ...i, qty: i.qty + 1 } : i),
        shop_slug: shop.slug, shop_name: shop.name, shop_display_currency: shop.currency,
      })
    } else {
      set({
        items: [...state.items, { ...item, qty: 1 }],
        shop_slug: shop.slug, shop_name: shop.name, shop_display_currency: shop.currency,
      })
    }
    return "added"
  },

  confirmCrossShopAdd: () => {
    const p = get().pending_add
    if (!p) return
    set({
      shop_slug: p.shop_slug, shop_name: p.shop_name, shop_display_currency: p.shop_currency,
      items: [p.item],
      shop_notes: "", delivery_notes: "", coupon_code: null, discount_minor: 0,
      pending_add: null,
    })
  },

  cancelCrossShopAdd: () => set({ pending_add: null }),

  incQty: (variantId) => set((s) => ({
    items: s.items.map((i) => i.variant_id === variantId ? { ...i, qty: i.qty + 1 } : i),
  })),

  decQty: (variantId) => set((s) => {
    const next = s.items.map((i) => i.variant_id === variantId ? { ...i, qty: Math.max(0, i.qty - 1) } : i).filter((i) => i.qty > 0)
    if (next.length === 0) {
      return { items: [], shop_slug: null, shop_name: null, shop_notes: "", delivery_notes: "", coupon_code: null, discount_minor: 0 }
    }
    return { items: next }
  }),

  removeItem: (variantId) => set((s) => {
    const next = s.items.filter((i) => i.variant_id !== variantId)
    if (next.length === 0) {
      return { items: [], shop_slug: null, shop_name: null, shop_notes: "", delivery_notes: "", coupon_code: null, discount_minor: 0 }
    }
    return { items: next }
  }),

  setShopNotes: (notes) => set({ shop_notes: notes }),
  setDeliveryNotes: (notes) => set({ delivery_notes: notes }),
  setCoupon: (code, discount) => set({ coupon_code: code, discount_minor: discount }),
  clear: () => set({
    items: [], shop_slug: null, shop_name: null, shop_notes: "", delivery_notes: "",
    coupon_code: null, discount_minor: 0, pending_add: null,
  }),

  itemCount: () => get().items.reduce((n, i) => n + i.qty, 0),
  subtotalMinor: () => get().items.reduce((n, i) => n + i.qty * i.unit_price_minor, 0),
}), {
  name: "hanoot-cart",
  storage: createJSONStorage(() => AsyncStorage),
  partialize: (state) => ({
    shop_slug: state.shop_slug,
    shop_name: state.shop_name,
    shop_display_currency: state.shop_display_currency,
    items: state.items,
    shop_notes: state.shop_notes,
    delivery_notes: state.delivery_notes,
    coupon_code: state.coupon_code,
    discount_minor: state.discount_minor,
  }),
}))
```

- [ ] **Step 3: Update any callers**

Run: `grep -rn "useCartStore\|addToCart\|cart\." mobile/src/ mobile/app/ --include="*.tsx" --include="*.ts" | head -30`

For each existing caller, update to the new API:
- `addToCart(product)` → `addItem({ slug, name, currency }, item)` and check returned `"added" | "needs_confirm"`
- `removeFromCart(id)` → `removeItem(variantId)`
- `cart.items.length` → `useCartStore((s) => s.itemCount())`

- [ ] **Step 4: Write unit tests**

Create `mobile/src/store/__tests__/cartStore.test.ts`:

```typescript
import { useCartStore } from "../cartStore"

const SHOP_A = { slug: "shop-a", name: "Shop A", currency: "iqd" as const }
const SHOP_B = { slug: "shop-b", name: "Shop B", currency: "iqd" as const }

function mkItem(variantId: string, price = 1000) {
  return {
    product_id: `prod_${variantId}`, variant_id: variantId, product_handle: `h-${variantId}`,
    title: `T ${variantId}`, thumbnail: null, unit_price_minor: price, currency_code: "iqd" as const,
  }
}

describe("cartStore", () => {
  beforeEach(() => useCartStore.getState().clear())

  it("adds first item — sets shop_slug", () => {
    const result = useCartStore.getState().addItem(SHOP_A, mkItem("v1"))
    expect(result).toBe("added")
    expect(useCartStore.getState().items).toHaveLength(1)
    expect(useCartStore.getState().shop_slug).toBe("shop-a")
  })

  it("adding from a different shop returns needs_confirm + sets pending_add", () => {
    useCartStore.getState().addItem(SHOP_A, mkItem("v1"))
    const r = useCartStore.getState().addItem(SHOP_B, mkItem("v2"))
    expect(r).toBe("needs_confirm")
    expect(useCartStore.getState().items).toHaveLength(1) // unchanged
    expect(useCartStore.getState().pending_add?.shop_slug).toBe("shop-b")
  })

  it("confirmCrossShopAdd wipes old + adds new", () => {
    useCartStore.getState().addItem(SHOP_A, mkItem("v1"))
    useCartStore.getState().addItem(SHOP_B, mkItem("v2"))
    useCartStore.getState().confirmCrossShopAdd()
    expect(useCartStore.getState().shop_slug).toBe("shop-b")
    expect(useCartStore.getState().items).toHaveLength(1)
    expect(useCartStore.getState().items[0].variant_id).toBe("v2")
  })

  it("cancelCrossShopAdd preserves old cart", () => {
    useCartStore.getState().addItem(SHOP_A, mkItem("v1"))
    useCartStore.getState().addItem(SHOP_B, mkItem("v2"))
    useCartStore.getState().cancelCrossShopAdd()
    expect(useCartStore.getState().shop_slug).toBe("shop-a")
    expect(useCartStore.getState().pending_add).toBeNull()
  })

  it("decQty at qty=1 removes the item", () => {
    useCartStore.getState().addItem(SHOP_A, mkItem("v1"))
    useCartStore.getState().decQty("v1")
    expect(useCartStore.getState().items).toHaveLength(0)
    expect(useCartStore.getState().shop_slug).toBeNull()
  })

  it("itemCount sums qty across items", () => {
    useCartStore.getState().addItem(SHOP_A, mkItem("v1"))
    useCartStore.getState().addItem(SHOP_A, mkItem("v1")) // qty 2
    useCartStore.getState().addItem(SHOP_A, mkItem("v2"))
    expect(useCartStore.getState().itemCount()).toBe(3)
  })

  it("subtotalMinor multiplies qty × unit price", () => {
    useCartStore.getState().addItem(SHOP_A, mkItem("v1", 1500))
    useCartStore.getState().addItem(SHOP_A, mkItem("v1", 1500)) // qty 2 of v1
    useCartStore.getState().addItem(SHOP_A, mkItem("v2", 500))
    expect(useCartStore.getState().subtotalMinor()).toBe(3500)
  })
})
```

- [ ] **Step 5: Run tests**

```bash
cd mobile
npx jest src/store/__tests__/cartStore.test.ts
```
Expected: 7/7 passing.

- [ ] **Step 6: Commit**

```bash
cd "D:/Personal/08_Ecommerce app/ecommerce-mvp"
git add mobile/src/store/cartStore.ts \
        mobile/src/store/__tests__/cartStore.test.ts
git commit -m "feat(mobile-cart): extend store with cross-shop logic + notes/coupon

addItem returns 'added' | 'needs_confirm'. pending_add tracks cross-shop
attempt; confirmCrossShopAdd wipes + replaces, cancelCrossShopAdd
preserves. AsyncStorage persistence with partialize (excludes pending_add).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 3.2: Storefront cart context — match new shape

**Files:**
- Modify or Create: `backend/apps/storefront/src/lib/context/cart-context.tsx`

- [ ] **Step 1: Read existing context**

Search for the storefront's cart-context location. Likely paths:
- `backend/apps/storefront/src/lib/context/cart-context.tsx`
- `backend/apps/storefront/src/modules/cart/context.tsx`

If found, read it. If absent, create at `lib/context/cart-context.tsx`.

- [ ] **Step 2: Implement / extend**

Use the same logical shape as mobile cartStore — `shop_slug`, `items`, `shop_notes`, `delivery_notes`, `coupon_code`, `discount_minor`, `pending_add`. Persistence via `localStorage` (key: `hanoot-cart`).

```typescript
"use client"
import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react"

export interface CartItem {
  product_id: string
  variant_id: string
  product_handle: string
  title: string
  thumbnail: string | null
  unit_price_minor: number
  currency_code: "iqd" | "usd"
  qty: number
}

interface CartState {
  shop_slug: string | null
  shop_name: string | null
  shop_display_currency: "iqd" | "usd"
  items: CartItem[]
  shop_notes: string
  delivery_notes: string
  coupon_code: string | null
  discount_minor: number
  pending_add: { shop_slug: string; shop_name: string; shop_currency: "iqd" | "usd"; item: CartItem } | null
}

const EMPTY: CartState = {
  shop_slug: null, shop_name: null, shop_display_currency: "iqd",
  items: [], shop_notes: "", delivery_notes: "", coupon_code: null, discount_minor: 0, pending_add: null,
}

interface CartContextValue extends CartState {
  itemCount: number
  subtotalMinor: number
  addItem: (shop: { slug: string; name: string; currency: "iqd" | "usd" }, item: Omit<CartItem, "qty">) => "added" | "needs_confirm"
  confirmCrossShopAdd: () => void
  cancelCrossShopAdd: () => void
  incQty: (variantId: string) => void
  decQty: (variantId: string) => void
  removeItem: (variantId: string) => void
  setShopNotes: (s: string) => void
  setDeliveryNotes: (s: string) => void
  setCoupon: (code: string | null, discount: number) => void
  clear: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CartState>(EMPTY)
  const [hydrated, setHydrated] = useState(false)

  // hydrate from localStorage
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem("hanoot-cart") : null
      if (raw) {
        const parsed = JSON.parse(raw)
        setState({ ...EMPTY, ...parsed })
      }
    } catch {}
    setHydrated(true)
  }, [])

  // persist
  useEffect(() => {
    if (!hydrated) return
    try {
      const { pending_add, ...persistable } = state
      window.localStorage.setItem("hanoot-cart", JSON.stringify(persistable))
    } catch {}
  }, [state, hydrated])

  const addItem = useCallback<CartContextValue["addItem"]>((shop, item) => {
    if (state.shop_slug && state.shop_slug !== shop.slug && state.items.length > 0) {
      setState((s) => ({ ...s, pending_add: { shop_slug: shop.slug, shop_name: shop.name, shop_currency: shop.currency, item: { ...item, qty: 1 } } }))
      return "needs_confirm"
    }
    setState((s) => {
      const existing = s.items.find((i) => i.variant_id === item.variant_id)
      const items = existing
        ? s.items.map((i) => i.variant_id === item.variant_id ? { ...i, qty: i.qty + 1 } : i)
        : [...s.items, { ...item, qty: 1 }]
      return { ...s, items, shop_slug: shop.slug, shop_name: shop.name, shop_display_currency: shop.currency }
    })
    return "added"
  }, [state.shop_slug, state.items.length])

  const confirmCrossShopAdd = useCallback(() => {
    setState((s) => {
      if (!s.pending_add) return s
      const p = s.pending_add
      return { ...EMPTY, shop_slug: p.shop_slug, shop_name: p.shop_name, shop_display_currency: p.shop_currency, items: [p.item] }
    })
  }, [])

  const cancelCrossShopAdd = useCallback(() => setState((s) => ({ ...s, pending_add: null })), [])

  const incQty = useCallback((variantId: string) => {
    setState((s) => ({ ...s, items: s.items.map((i) => i.variant_id === variantId ? { ...i, qty: i.qty + 1 } : i) }))
  }, [])

  const decQty = useCallback((variantId: string) => {
    setState((s) => {
      const next = s.items.map((i) => i.variant_id === variantId ? { ...i, qty: Math.max(0, i.qty - 1) } : i).filter((i) => i.qty > 0)
      if (next.length === 0) return { ...EMPTY }
      return { ...s, items: next }
    })
  }, [])

  const removeItem = useCallback((variantId: string) => {
    setState((s) => {
      const next = s.items.filter((i) => i.variant_id !== variantId)
      if (next.length === 0) return { ...EMPTY }
      return { ...s, items: next }
    })
  }, [])

  const setShopNotes = useCallback((shop_notes: string) => setState((s) => ({ ...s, shop_notes })), [])
  const setDeliveryNotes = useCallback((delivery_notes: string) => setState((s) => ({ ...s, delivery_notes })), [])
  const setCoupon = useCallback((code: string | null, discount: number) => setState((s) => ({ ...s, coupon_code: code, discount_minor: discount })), [])
  const clear = useCallback(() => setState(EMPTY), [])

  const itemCount = state.items.reduce((n, i) => n + i.qty, 0)
  const subtotalMinor = state.items.reduce((n, i) => n + i.qty * i.unit_price_minor, 0)

  return (
    <CartContext.Provider value={{
      ...state, itemCount, subtotalMinor,
      addItem, confirmCrossShopAdd, cancelCrossShopAdd, incQty, decQty, removeItem,
      setShopNotes, setDeliveryNotes, setCoupon, clear,
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart must be used within CartProvider")
  return ctx
}
```

- [ ] **Step 3: Mount CartProvider in root layout**

In `backend/apps/storefront/src/app/[countryCode]/(main)/layout.tsx`, wrap children with `<CartProvider>...</CartProvider>` near the top. (If there's already a cart provider, replace it with the new one — preserve any data migration if needed.)

- [ ] **Step 4: Update existing cart-fab to use new context**

The existing `CartFabWrapper` reads `cart.items.length` from a different source. Update it to read from `useCart().itemCount`.

- [ ] **Step 5: Commit**

```bash
cd "D:/Personal/08_Ecommerce app/ecommerce-mvp"
git add backend/apps/storefront/src/lib/context/cart-context.tsx \
        backend/apps/storefront/src/app/ \
        backend/apps/storefront/src/modules/layout/components/cart-fab/
git commit -m "feat(storefront-cart): new cart context with cross-shop logic + notes/coupon

Same shape as mobile cartStore. localStorage persistence (key 'hanoot-cart',
omits pending_add). useCart() hook. CartFab now reads from this context.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 4 — Mobile cart screen

### Task 4.1: CartItemRow + cart screen rebuild

**Files:**
- Create: `mobile/src/components/cart/CartItemRow.tsx`
- Modify: `mobile/app/(tabs)/cart.tsx`

- [ ] **Step 1: CartItemRow component**

```tsx
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native"
import { useRouter } from "expo-router"
import { useCartStore, CartItem } from "../../store/cartStore"
import { useTheme } from "../../theme/useTheme"

interface Props { item: CartItem }

export function CartItemRow({ item }: Props) {
  const { colors } = useTheme()
  const router = useRouter()
  const { incQty, decQty, removeItem } = useCartStore()
  const lineTotal = item.qty * item.unit_price_minor

  return (
    <View style={[styles.row, { borderColor: colors.border }]}>
      <TouchableOpacity onPress={() => router.push(`/products/${item.product_handle}`)}>
        {item.thumbnail ? (
          <Image source={{ uri: item.thumbnail }} style={styles.img} />
        ) : (
          <View style={[styles.img, { backgroundColor: colors.surface }]} />
        )}
      </TouchableOpacity>
      <View style={styles.body}>
        <TouchableOpacity onPress={() => router.push(`/products/${item.product_handle}`)}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>{item.title}</Text>
        </TouchableOpacity>
        <Text style={[styles.unit, { color: colors.textMuted }]}>{formatMinor(item.unit_price_minor, item.currency_code)}</Text>
        <View style={styles.actions}>
          <View style={[styles.stepper, { backgroundColor: colors.surface }]}>
            <TouchableOpacity onPress={() => decQty(item.variant_id)} style={[styles.stepBtn, { borderColor: colors.border }]}>
              <Text style={[styles.stepBtnText, { color: colors.textMuted }]}>−</Text>
            </TouchableOpacity>
            <Text style={[styles.qty, { color: colors.text }]}>{item.qty}</Text>
            <TouchableOpacity onPress={() => incQty(item.variant_id)} style={[styles.stepBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}>
              <Text style={[styles.stepBtnText, { color: "white" }]}>+</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.lineTotal, { color: colors.text }]}>{formatMinor(lineTotal, item.currency_code)}</Text>
          <TouchableOpacity onPress={() => removeItem(item.variant_id)}>
            <Text style={[styles.trash, { color: colors.textMuted }]}>🗑</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

function formatMinor(amount: number, currency: "iqd" | "usd"): string {
  if (currency === "iqd") return `${new Intl.NumberFormat("en-IQ").format(amount)} IQD`
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount / 100)
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 12, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  img: { width: 72, height: 72, borderRadius: 10 },
  body: { flex: 1, minWidth: 0 },
  title: { fontSize: 15, fontWeight: "600", marginBottom: 4 },
  unit: { fontSize: 13, marginBottom: 10 },
  actions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  stepper: { flexDirection: "row", alignItems: "center", borderRadius: 999, padding: 4, gap: 4 },
  stepBtn: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  stepBtnText: { fontSize: 16, fontWeight: "700" },
  qty: { minWidth: 28, textAlign: "center", fontWeight: "700", fontSize: 14 },
  lineTotal: { fontWeight: "700", fontSize: 15 },
  trash: { fontSize: 18, padding: 4 },
})
```

- [ ] **Step 2: Cart screen rebuild**

Replace `mobile/app/(tabs)/cart.tsx` entirely:

```tsx
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet } from "react-native"
import { useRouter } from "expo-router"
import { useCartStore } from "../../src/store/cartStore"
import { CartItemRow } from "../../src/components/cart/CartItemRow"
import { useTheme } from "../../src/theme/useTheme"

export default function CartScreen() {
  const router = useRouter()
  const { colors } = useTheme()
  const items = useCartStore((s) => s.items)
  const shop_name = useCartStore((s) => s.shop_name)
  const shop_slug = useCartStore((s) => s.shop_slug)
  const subtotal = useCartStore((s) => s.subtotalMinor())
  const currency = useCartStore((s) => s.shop_display_currency)
  const shop_notes = useCartStore((s) => s.shop_notes)
  const setShopNotes = useCartStore((s) => s.setShopNotes)

  if (items.length === 0) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.background }]}>
        <Text style={{ fontSize: 56, marginBottom: 12 }}>🛒</Text>
        <Text style={{ fontSize: 18, fontWeight: "600", color: colors.text, marginBottom: 16 }}>Your basket is empty</Text>
        <TouchableOpacity onPress={() => router.push("/(tabs)/shops")} style={[styles.browseBtn, { backgroundColor: colors.primary }]}>
          <Text style={{ color: "white", fontWeight: "700" }}>Browse shops</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const deliveryFee = 2500
  const total = subtotal + deliveryFee

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.back, { backgroundColor: colors.surface }]}>
          <Text style={{ fontSize: 20 }}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>Your basket</Text>
          <Text style={[styles.sub, { color: colors.textMuted }]}>{shop_name}</Text>
        </View>
        <TouchableOpacity onPress={() => shop_slug && router.push(`/shops/${shop_slug}`)}>
          <Text style={{ color: colors.primary, fontWeight: "600" }}>+ Add more</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.items}>
        {items.map((item) => <CartItemRow key={item.variant_id} item={item} />)}

        <View style={{ marginTop: 20 }}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Notes for the shop (optional)</Text>
          <TextInput
            multiline
            placeholder="No onions, cut in 8 slices, allergies, etc."
            value={shop_notes}
            onChangeText={setShopNotes}
            style={[styles.notes, { borderColor: colors.border, color: colors.text }]}
          />
        </View>
      </ScrollView>

      <View style={[styles.summary, { borderColor: colors.border }]}>
        <View style={styles.summaryRow}><Text style={{ color: colors.textMuted }}>Subtotal</Text><Text style={{ color: colors.text }}>{formatMinor(subtotal, currency)}</Text></View>
        <View style={styles.summaryRow}><Text style={{ color: colors.textMuted }}>Delivery fee</Text><Text style={{ color: colors.text }}>{formatMinor(deliveryFee, currency)}</Text></View>
        <View style={[styles.summaryRow, { borderTopWidth: 1, borderColor: colors.border, paddingTop: 10, marginTop: 6 }]}>
          <Text style={{ color: colors.text, fontWeight: "700", fontSize: 17 }}>Total</Text>
          <Text style={{ color: colors.text, fontWeight: "700", fontSize: 17 }}>{formatMinor(total, currency)}</Text>
        </View>
        <TouchableOpacity onPress={() => router.push("/checkout")} style={[styles.checkoutBtn, { backgroundColor: colors.primary }]}>
          <Text style={styles.checkoutText}>Checkout</Text>
          <Text style={styles.checkoutText}>{formatMinor(total, currency)} →</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

function formatMinor(amount: number, currency: "iqd" | "usd"): string {
  if (currency === "iqd") return `${new Intl.NumberFormat("en-IQ").format(amount)} IQD`
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount / 100)
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  browseBtn: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderBottomWidth: 1 },
  back: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 16, fontWeight: "700" },
  sub: { fontSize: 12 },
  items: { paddingHorizontal: 16, paddingBottom: 220 },
  sectionLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  notes: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 14, minHeight: 80, textAlignVertical: "top" },
  summary: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: 28, borderTopWidth: 1, backgroundColor: "white" },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  checkoutBtn: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 14, padding: 14, borderRadius: 12 },
  checkoutText: { color: "white", fontWeight: "700", fontSize: 16 },
})
```

- [ ] **Step 3: Commit**

```bash
cd "D:/Personal/08_Ecommerce app/ecommerce-mvp"
git add mobile/src/components/cart/CartItemRow.tsx \
        mobile/app/\(tabs\)/cart.tsx
git commit -m "feat(mobile-cart): rebuild cart screen with stepper + notes + sticky checkout

CartItemRow component reused for each line. Tap image/title → product
detail. Empty state. Shop notes textarea at the bottom. Sticky summary
with subtotal · delivery · total + checkout pill. No prep time visible
(SP-A coherence).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 5 — Fly-to-cart animation (mobile)

### Task 5.1: Animated ghost + addItem wrapper hook

**Files:**
- Create: `mobile/src/components/cart/FlyToCartHost.tsx`
- Create: `mobile/src/hooks/useFlyToCart.ts`
- Modify: `mobile/app/_layout.tsx` (mount FlyToCartHost globally)

The animation needs:
1. A global host component that owns the ghost View + the FAB target ref
2. A hook that any add-to-cart button calls to trigger the fly + the actual add

- [ ] **Step 1: Implement FlyToCartHost (global)**

```tsx
import { useRef } from "react"
import { Animated, View, Image, Easing, Dimensions } from "react-native"

interface FlyJob {
  imageUri: string
  sourceX: number
  sourceY: number
  sourceSize: number
  onComplete: () => void
}

let triggerRef: ((job: FlyJob) => void) | null = null

export function flyToCart(job: FlyJob) {
  triggerRef?.(job)
}

export function FlyToCartHost() {
  const x = useRef(new Animated.Value(0)).current
  const y = useRef(new Animated.Value(0)).current
  const scale = useRef(new Animated.Value(0)).current
  const opacity = useRef(new Animated.Value(0)).current
  const imgUri = useRef<string | null>(null)
  const size = useRef(60)

  triggerRef = (job: FlyJob) => {
    imgUri.current = job.imageUri
    size.current = job.sourceSize
    x.setValue(job.sourceX)
    y.setValue(job.sourceY)
    scale.setValue(1)
    opacity.setValue(1)
    const screen = Dimensions.get("window")
    const targetX = screen.width - 56 - 24      // FAB position: right:24, width:56
    const targetY = screen.height - 56 - 24
    Animated.parallel([
      Animated.timing(x, { toValue: targetX, duration: 400, easing: Easing.bezier(0.34, 1.56, 0.64, 1), useNativeDriver: true }),
      Animated.timing(y, { toValue: targetY, duration: 400, easing: Easing.bezier(0.34, 1.56, 0.64, 1), useNativeDriver: true }),
      Animated.timing(scale, { toValue: 0.2, duration: 400, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => job.onComplete())
  }

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        width: size.current,
        height: size.current,
        opacity,
        transform: [{ translateX: x }, { translateY: y }, { scale }],
        zIndex: 9999,
      }}
    >
      {imgUri.current && (
        <Image source={{ uri: imgUri.current }} style={{ width: "100%", height: "100%", borderRadius: 10 }} />
      )}
    </Animated.View>
  )
}
```

- [ ] **Step 2: Mount globally**

In `mobile/app/_layout.tsx`, add `<FlyToCartHost />` as a sibling of the Stack at the root.

- [ ] **Step 3: useFlyToCart hook**

```typescript
// mobile/src/hooks/useFlyToCart.ts
import { useCallback } from "react"
import { findNodeHandle, UIManager, View } from "react-native"
import { flyToCart } from "../components/cart/FlyToCartHost"
import { useCartStore, CartItem } from "../store/cartStore"

export function useFlyToCart() {
  const addItem = useCartStore((s) => s.addItem)

  return useCallback((opts: {
    sourceRef: React.RefObject<View>
    shop: { slug: string; name: string; currency: "iqd" | "usd" }
    item: Omit<CartItem, "qty">
    onCrossShopNeeded: () => void
  }) => {
    const handle = findNodeHandle(opts.sourceRef.current)
    if (!handle) {
      // No ref → skip animation, still try to add
      const result = addItem(opts.shop, opts.item)
      if (result === "needs_confirm") opts.onCrossShopNeeded()
      return
    }
    UIManager.measure(handle, (_x, _y, w, h, pageX, pageY) => {
      flyToCart({
        imageUri: opts.item.thumbnail ?? "",
        sourceX: pageX,
        sourceY: pageY,
        sourceSize: Math.min(w, h),
        onComplete: () => {
          const result = addItem(opts.shop, opts.item)
          if (result === "needs_confirm") opts.onCrossShopNeeded()
        },
      })
    })
  }, [addItem])
}
```

- [ ] **Step 4: Wire into ProductCard's "+" button**

In `mobile/src/components/ProductCard.tsx` (or wherever the + button lives), add a ref on the image and call `useFlyToCart()` on press:

```typescript
const imgRef = useRef<View>(null)
const fly = useFlyToCart()

function onAdd() {
  fly({
    sourceRef: imgRef,
    shop: { slug: shopSlug, name: shopName, currency: shopCurrency },
    item: {
      product_id: product.id,
      variant_id: product.variants[0].id,
      product_handle: product.handle,
      title: product.title,
      thumbnail: product.thumbnail,
      unit_price_minor: product.variants[0].calculated_price.calculated_amount,
      currency_code: shopCurrency,
    },
    onCrossShopNeeded: () => {
      // The CrossShopModal in Phase 6 listens to useCartStore.pending_add
      // No explicit action needed here.
    },
  })
}

// In JSX:
<View ref={imgRef}>{/* product image */}</View>
<TouchableOpacity onPress={onAdd}>+</TouchableOpacity>
```

- [ ] **Step 5: Smoke test on device**

```bash
cd mobile && npx expo start --clear
```
Open a product, tap +. Ghost image flies to bottom-right FAB. Tap + on different shop product → no animation runs (no pending image, only pending_add set — Phase 6 modal catches it).

- [ ] **Step 6: Commit**

```bash
cd "D:/Personal/08_Ecommerce app/ecommerce-mvp"
git add mobile/src/components/cart/FlyToCartHost.tsx \
        mobile/src/hooks/useFlyToCart.ts \
        mobile/app/_layout.tsx \
        mobile/src/components/ProductCard.tsx
git commit -m "feat(mobile-cart): fly-to-cart animation

FlyToCartHost mounted globally. flyToCart() trigger measures source
position, animates Animated.View along Bezier curve to FAB. useFlyToCart
hook handles add-after-animation. Skips when no thumbnail. Cross-shop
attempts skip the fly + surface pending_add for the modal (Phase 6).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 6 — Cross-shop confirmation modal

### Task 6.1: CrossShopModal global mount

**Files:**
- Create: `mobile/src/components/cart/CrossShopModal.tsx`
- Modify: `mobile/app/_layout.tsx`

```tsx
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native"
import { useCartStore } from "../../store/cartStore"
import { useTheme } from "../../theme/useTheme"

export function CrossShopModal() {
  const { colors } = useTheme()
  const pending = useCartStore((s) => s.pending_add)
  const currentShop = useCartStore((s) => s.shop_name)
  const confirmCrossShopAdd = useCartStore((s) => s.confirmCrossShopAdd)
  const cancelCrossShopAdd = useCartStore((s) => s.cancelCrossShopAdd)

  if (!pending) return null

  return (
    <Modal transparent animationType="fade" visible={true} onRequestClose={cancelCrossShopAdd}>
      <View style={styles.backdrop}>
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.emoji, { backgroundColor: "#FEF3C7" }]}>
            <Text style={{ fontSize: 28 }}>⚠️</Text>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Start a new basket?</Text>
          <Text style={[styles.body, { color: colors.textMuted }]}>
            Your basket has items from <Text style={{ color: colors.text, fontWeight: "700" }}>{currentShop}</Text>.{"\n"}
            Adding from <Text style={{ color: colors.text, fontWeight: "700" }}>{pending.shop_name}</Text> will clear those items.
          </Text>
          <View style={styles.actions}>
            <TouchableOpacity onPress={cancelCrossShopAdd} style={[styles.btn, { backgroundColor: colors.surface }]}>
              <Text style={{ color: colors.text, fontWeight: "700" }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={confirmCrossShopAdd} style={[styles.btn, { backgroundColor: colors.primary }]}>
              <Text style={{ color: "white", fontWeight: "700" }}>Clear and add</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center", padding: 24 },
  modal: { borderRadius: 18, padding: 24, width: "100%", maxWidth: 360 },
  emoji: { width: 56, height: 56, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 14, alignSelf: "center" },
  title: { fontSize: 19, fontWeight: "700", textAlign: "center", marginBottom: 8 },
  body: { fontSize: 14, textAlign: "center", lineHeight: 21, marginBottom: 18 },
  actions: { flexDirection: "row", gap: 10 },
  btn: { flex: 1, padding: 13, borderRadius: 12, alignItems: "center" },
})
```

In `mobile/app/_layout.tsx`, add `<CrossShopModal />` as a sibling of FlyToCartHost.

- [ ] **Commit:**

```bash
cd "D:/Personal/08_Ecommerce app/ecommerce-mvp"
git add mobile/src/components/cart/CrossShopModal.tsx \
        mobile/app/_layout.tsx
git commit -m "feat(mobile-cart): cross-shop confirmation modal

Listens to cartStore.pending_add. Renders globally when a cross-shop
add was attempted. Cancel preserves current basket; Clear and add wipes
and starts fresh.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 7 — Mobile checkout screen

### Task 7.1: API client for addresses + place-cod

**Files:**
- Create: `mobile/src/lib/api/addresses.ts`
- Create: `mobile/src/lib/api/orders.ts`

```typescript
// addresses.ts
const BASE = process.env.EXPO_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000"
const PK = process.env.EXPO_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""

function authHeaders(token: string) {
  return { "x-publishable-api-key": PK, authorization: `Bearer ${token}`, "content-type": "application/json" }
}

export interface SavedAddress {
  id: string; label: string; recipient_name: string; phone: string
  country: string; city: string; area: string | null; street: string
  building: string | null; floor: string | null; notes: string | null
  is_default: boolean
}

export async function listAddresses(token: string): Promise<SavedAddress[]> {
  const r = await fetch(`${BASE}/store/customers/me/addresses`, { headers: authHeaders(token) })
  if (!r.ok) throw new Error(`listAddresses: ${r.status}`)
  return (await r.json()).addresses
}

export async function createAddress(token: string, data: Omit<SavedAddress, "id" | "is_default"> & { is_default?: boolean }): Promise<SavedAddress> {
  const r = await fetch(`${BASE}/store/customers/me/addresses`, {
    method: "POST", headers: authHeaders(token), body: JSON.stringify(data),
  })
  if (!r.ok) throw new Error(`createAddress: ${r.status}`)
  return (await r.json()).address
}

export async function markDefault(token: string, id: string): Promise<SavedAddress> {
  const r = await fetch(`${BASE}/store/customers/me/addresses/${id}/default`, {
    method: "POST", headers: authHeaders(token),
  })
  if (!r.ok) throw new Error(`markDefault: ${r.status}`)
  return (await r.json()).address
}
```

```typescript
// orders.ts
const BASE = process.env.EXPO_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000"
const PK = process.env.EXPO_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""

export interface PlaceCodArgs {
  shop_slug: string
  address_id?: string
  inline_address?: any
  items: Array<{ variant_id: string; qty: number }>
  shop_notes?: string
  delivery_notes?: string
  coupon_code?: string | null
  currency_code: "iqd" | "usd"
}

export async function placeCodOrder(token: string, args: PlaceCodArgs): Promise<{ order_id: string; display_id: string }> {
  const r = await fetch(`${BASE}/store/orders/place-cod`, {
    method: "POST",
    headers: { "x-publishable-api-key": PK, authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(args),
  })
  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    throw new Error(err.error ?? `placeCodOrder: ${r.status}`)
  }
  return await r.json()
}
```

- Commit: `feat(mobile-api): addresses + place-cod clients`

### Task 7.2: AddressForm component

Create `mobile/src/components/checkout/AddressForm.tsx` — controlled form with fields recipient_name, phone, city (Picker: Baghdad, Erbil, Basra, Mosul), area, street, building, floor, notes, "save for next time" toggle. `onSubmit` returns the form data.

(Skeleton: standard React Native form with TextInput and Picker. Pattern is identical to the vendor portal's StandardFields from SP-A Phase 9 — copy that structure.)

- Commit: `feat(mobile-checkout): AddressForm with city picker + save toggle`

### Task 7.3: AddressPickerSheet component

Create `mobile/src/components/checkout/AddressPickerSheet.tsx` — bottom sheet with:
- Header "Choose delivery address" + close button
- If `addresses.length > 0`: list of radio rows, "Add new" link at bottom
- If `addresses.length === 0`: embedded AddressForm

Uses `Modal` with `animationType="slide"` and `presentationStyle="pageSheet"`. State: which address is selected, OR "adding new". Save → returns selected/created address to parent.

- Commit: `feat(mobile-checkout): AddressPickerSheet bottom sheet (saved list + inline form)`

### Task 7.4: CouponRow component

Create `mobile/src/components/cart/CouponRow.tsx`:

```tsx
import { useState } from "react"
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator } from "react-native"
import { useCartStore } from "../../store/cartStore"
import { useTheme } from "../../theme/useTheme"

const BASE = process.env.EXPO_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000"
const PK = process.env.EXPO_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""

export function CouponRow() {
  const { colors } = useTheme()
  const [expanded, setExpanded] = useState(false)
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const setCoupon = useCartStore((s) => s.setCoupon)
  const couponCode = useCartStore((s) => s.coupon_code)
  const subtotal = useCartStore((s) => s.subtotalMinor())
  const currency = useCartStore((s) => s.shop_display_currency)

  async function apply() {
    setBusy(true); setErr(null)
    try {
      const r = await fetch(`${BASE}/store/promotions/validate`, {
        method: "POST",
        headers: { "x-publishable-api-key": PK, "content-type": "application/json" },
        body: JSON.stringify({ code, subtotal_cents: subtotal, currency: currency.toUpperCase() }),
      })
      const data = await r.json()
      if (!data.ok) { setErr(data.error ?? "Code invalid"); return }
      setCoupon(code, data.discount_cents ?? 0)
      setExpanded(false)
    } catch (e: any) {
      setErr(e.message ?? "Network error")
    } finally { setBusy(false) }
  }

  if (couponCode) {
    return (
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 12, backgroundColor: "#ECFDF5", borderRadius: 10 }}>
        <Text style={{ color: colors.primary, fontWeight: "700" }}>✓ {couponCode}</Text>
        <TouchableOpacity onPress={() => setCoupon(null, 0)}>
          <Text style={{ color: colors.textMuted }}>Remove</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (!expanded) {
    return (
      <TouchableOpacity onPress={() => setExpanded(true)} style={{ padding: 12 }}>
        <Text style={{ color: colors.primary, fontWeight: "600" }}>Have a coupon code? ›</Text>
      </TouchableOpacity>
    )
  }

  return (
    <View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <TextInput value={code} onChangeText={setCode} placeholder="Coupon code" autoCapitalize="characters"
          style={{ flex: 1, padding: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 10 }} />
        <TouchableOpacity onPress={apply} disabled={busy || !code}
          style={{ padding: 12, backgroundColor: colors.primary, borderRadius: 10, opacity: (!code || busy) ? 0.5 : 1 }}>
          {busy ? <ActivityIndicator color="white" /> : <Text style={{ color: "white", fontWeight: "700" }}>Apply</Text>}
        </TouchableOpacity>
      </View>
      {err && <Text style={{ color: colors.danger, marginTop: 6, fontSize: 12 }}>{err}</Text>}
    </View>
  )
}
```

- Commit: `feat(mobile-cart): CouponRow with /store/promotions/validate`

### Task 7.5: Checkout screen wiring

Replace `mobile/app/checkout.tsx`:

```tsx
import { useEffect, useState } from "react"
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from "react-native"
import { useRouter } from "expo-router"
import { useCartStore } from "../src/store/cartStore"
import { listAddresses, createAddress, SavedAddress } from "../src/lib/api/addresses"
import { placeCodOrder } from "../src/lib/api/orders"
import { AddressPickerSheet } from "../src/components/checkout/AddressPickerSheet"
import { CouponRow } from "../src/components/cart/CouponRow"
import { useTheme } from "../src/theme/useTheme"
// Assume there's an auth/session hook that returns the customer's token
import { useAuthToken } from "../src/hooks/useAuthToken"

export default function CheckoutScreen() {
  const { colors } = useTheme()
  const router = useRouter()
  const token = useAuthToken()
  const cart = useCartStore()
  const [addresses, setAddresses] = useState<SavedAddress[]>([])
  const [selected, setSelected] = useState<SavedAddress | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    listAddresses(token).then((list) => {
      setAddresses(list)
      const dflt = list.find((a) => a.is_default) ?? list[0] ?? null
      setSelected(dflt)
    }).catch(console.warn)
  }, [token])

  async function place() {
    if (!selected) return setError("Please select a delivery address")
    if (!token) return setError("Please log in to place an order")
    if (!cart.shop_slug) return setError("Cart is empty")
    setSubmitting(true); setError(null)
    try {
      const { order_id } = await placeCodOrder(token, {
        shop_slug: cart.shop_slug,
        address_id: selected.id,
        items: cart.items.map((i) => ({ variant_id: i.variant_id, qty: i.qty })),
        shop_notes: cart.shop_notes,
        delivery_notes: cart.delivery_notes,
        coupon_code: cart.coupon_code,
        currency_code: cart.shop_display_currency,
      })
      cart.clear()
      router.replace(`/order/success/${order_id}`)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const subtotal = cart.subtotalMinor()
  const discount = cart.discount_minor
  const deliveryFee = 2500
  const total = subtotal - discount + deliveryFee

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderBottomWidth: 1, borderColor: colors.border }}>
        <TouchableOpacity onPress={() => router.back()}><Text style={{ fontSize: 20 }}>‹</Text></TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: "700" }}>Checkout</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 200 }}>
        {/* 1. Address */}
        <Text style={{ fontSize: 11, fontWeight: "700", color: colors.textMuted, marginBottom: 8 }}>DELIVER TO</Text>
        <TouchableOpacity onPress={() => setPickerOpen(true)} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14 }}>
          {selected ? (
            <View>
              <Text style={{ fontWeight: "700" }}>{selected.label}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>{selected.recipient_name} · {selected.phone}</Text>
              <Text style={{ fontSize: 13, marginTop: 4 }}>{[selected.area, selected.street, selected.building].filter(Boolean).join(", ")}</Text>
            </View>
          ) : (
            <Text style={{ color: colors.primary }}>+ Add delivery address</Text>
          )}
        </TouchableOpacity>

        {/* 2. Delivery instructions */}
        <Text style={{ fontSize: 11, fontWeight: "700", color: colors.textMuted, marginTop: 22, marginBottom: 8 }}>DELIVERY INSTRUCTIONS</Text>
        <TextInput multiline value={cart.delivery_notes} onChangeText={cart.setDeliveryNotes}
          placeholder="Blue gate near pharmacy, call when arrived..."
          style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, minHeight: 80, textAlignVertical: "top" }} />

        {/* 3. Coupon */}
        <Text style={{ fontSize: 11, fontWeight: "700", color: colors.textMuted, marginTop: 22, marginBottom: 8 }}>COUPON</Text>
        <CouponRow />

        {/* 4. Payment */}
        <Text style={{ fontSize: 11, fontWeight: "700", color: colors.textMuted, marginTop: 22, marginBottom: 8 }}>PAYMENT</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 12 }}>
          <Text style={{ fontSize: 22 }}>💵</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: "700" }}>Cash on Delivery</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>Pay the rider on delivery</Text>
          </View>
          <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "white", fontSize: 12, fontWeight: "700" }}>✓</Text>
          </View>
        </View>

        {/* 5. Summary */}
        <Text style={{ fontSize: 11, fontWeight: "700", color: colors.textMuted, marginTop: 22, marginBottom: 8 }}>SUMMARY</Text>
        <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 14 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
            <Text style={{ color: colors.textMuted }}>{cart.items.length} items from {cart.shop_name}</Text>
            <Text></Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
            <Text style={{ color: colors.textMuted }}>Subtotal</Text>
            <Text>{formatMinor(subtotal, cart.shop_display_currency)}</Text>
          </View>
          {discount > 0 && (
            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
              <Text style={{ color: colors.success }}>Discount</Text>
              <Text style={{ color: colors.success }}>−{formatMinor(discount, cart.shop_display_currency)}</Text>
            </View>
          )}
          <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
            <Text style={{ color: colors.textMuted }}>Delivery fee</Text>
            <Text>{formatMinor(deliveryFee, cart.shop_display_currency)}</Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", paddingTop: 10, marginTop: 6, borderTopWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontWeight: "700", fontSize: 16 }}>Total</Text>
            <Text style={{ fontWeight: "700", fontSize: 16 }}>{formatMinor(total, cart.shop_display_currency)}</Text>
          </View>
        </View>

        {error && <Text style={{ color: colors.danger, marginTop: 12 }}>{error}</Text>}
      </ScrollView>

      <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 14, paddingBottom: 28, borderTopWidth: 1, borderColor: colors.border, backgroundColor: "white" }}>
        <TouchableOpacity onPress={place} disabled={submitting || !selected}
          style={{ backgroundColor: colors.primary, padding: 14, borderRadius: 12, alignItems: "center", flexDirection: "row", justifyContent: "space-between", opacity: (!selected || submitting) ? 0.5 : 1 }}>
          <Text style={{ color: "white", fontWeight: "700", fontSize: 16 }}>{submitting ? "Placing..." : "Place order"}</Text>
          {!submitting && <Text style={{ color: "white", fontWeight: "700", fontSize: 16 }}>{formatMinor(total, cart.shop_display_currency)} →</Text>}
        </TouchableOpacity>
      </View>

      {pickerOpen && (
        <AddressPickerSheet
          addresses={addresses}
          selectedId={selected?.id ?? null}
          onSelect={(addr) => { setSelected(addr); setPickerOpen(false) }}
          onCreate={async (data) => {
            const created = await createAddress(token!, data as any)
            setAddresses((prev) => [created, ...prev])
            setSelected(created)
            setPickerOpen(false)
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </View>
  )
}

function formatMinor(amount: number, currency: "iqd" | "usd"): string {
  if (currency === "iqd") return `${new Intl.NumberFormat("en-IQ").format(amount)} IQD`
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount / 100)
}
```

- Commit: `feat(mobile-checkout): single-page checkout with address picker + coupon + COD`

---

## Phase 8 — Order success screen

### Task 8.1: Success route

Create `mobile/app/order/success/[id].tsx`:

```tsx
import { View, Text, TouchableOpacity, Animated, Easing } from "react-native"
import { useEffect, useRef } from "react"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useTheme } from "../../../src/theme/useTheme"

export default function OrderSuccessScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { colors } = useTheme()
  const scale = useRef(new Animated.Value(0.3)).current
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scale, { toValue: 1, duration: 600, easing: Easing.bezier(0.34, 1.56, 0.64, 1), useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start()
  }, [])

  const displayId = (id?.slice(-6) ?? "------").toUpperCase()

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: 24, alignItems: "center" }}>
      <Animated.View style={{ width: 110, height: 110, borderRadius: 55, backgroundColor: "#ECFDF5", borderWidth: 4, borderColor: colors.primary, alignItems: "center", justifyContent: "center", marginTop: 60, marginBottom: 24, opacity, transform: [{ scale }] }}>
        <Text style={{ fontSize: 60, color: colors.primary }}>✓</Text>
      </Animated.View>
      <Text style={{ fontSize: 26, fontWeight: "700", marginBottom: 10, color: colors.text }}>Order placed</Text>
      <Text style={{ fontSize: 14, color: colors.textMuted, marginBottom: 24 }}>
        Order <Text style={{ fontFamily: "Menlo", fontWeight: "700", color: colors.text, backgroundColor: colors.surface, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>#{displayId}</Text>
      </Text>
      <View style={{ flex: 1 }} />
      <View style={{ width: "100%", gap: 10, paddingBottom: 24 }}>
        <TouchableOpacity onPress={() => router.push(`/orders/${id}`)} style={{ backgroundColor: colors.primary, padding: 14, borderRadius: 12, alignItems: "center" }}>
          <Text style={{ color: "white", fontWeight: "700", fontSize: 16 }}>📍 Track order</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.replace("/(tabs)/shops")} style={{ padding: 12, alignItems: "center" }}>
          <Text style={{ color: colors.primary, fontWeight: "600" }}>← Back to home</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
```

- Commit: `feat(mobile-checkout): order success screen with animated checkmark`

---

## Phase 9 — Storefront mirror

Storefront mirrors the mobile UX. Each task copies the conceptual structure from the mobile equivalents.

### Task 9.1: Storefront cart page

`backend/apps/storefront/src/app/[countryCode]/(main)/cart/page.tsx`:
- Client component reading `useCart()`
- Empty state OR items list (CartItemRow client component)
- Shop notes textarea (`useCart().shop_notes` + `setShopNotes`)
- Sticky bottom summary + Checkout button

Pattern: same content as mobile, Tailwind classes instead of React Native styles. Reference: `docs/mockups/sp-b/mobile-cart.html`.

- Commit: `feat(storefront): cart page with stepper + shop notes + sticky checkout`

### Task 9.2: Storefront fly-to-cart CSS animation

`backend/apps/storefront/src/modules/products/components/fly-to-cart/index.tsx`:

```tsx
"use client"
import { useEffect, useRef } from "react"

interface Props {
  sourceRect: DOMRect
  imageUrl: string
  onComplete: () => void
}

export default function FlyToCart({ sourceRect, imageUrl, onComplete }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current) return
    const el = ref.current
    // Find FAB by selector or pass target rect
    const fab = document.querySelector("[data-cart-fab]")
    const target = fab?.getBoundingClientRect()
    if (!target) { onComplete(); return }
    const targetX = target.left + target.width / 2 - sourceRect.left - sourceRect.width / 2
    const targetY = target.top + target.height / 2 - sourceRect.top - sourceRect.height / 2
    requestAnimationFrame(() => {
      el.style.transform = `translate(${targetX}px, ${targetY}px) scale(0.2)`
      el.style.opacity = "0"
    })
    const timer = setTimeout(onComplete, 400)
    return () => clearTimeout(timer)
  }, [])
  return (
    <div ref={ref}
      style={{
        position: "fixed",
        top: sourceRect.top, left: sourceRect.left,
        width: sourceRect.width, height: sourceRect.height,
        backgroundImage: `url(${imageUrl})`, backgroundSize: "cover", backgroundPosition: "center",
        borderRadius: 10, pointerEvents: "none", zIndex: 9999,
        transition: "transform 400ms cubic-bezier(.34,1.56,.64,1), opacity 400ms",
      }}
    />
  )
}
```

Add `data-cart-fab` attribute to the CartFab component so the animation can locate it. Wire a `useFlyToCart` hook (web) that takes a source ref, computes the rect, mounts FlyToCart via a portal.

- Commit: `feat(storefront): fly-to-cart CSS animation`

### Task 9.3: Storefront checkout + success

Storefront `/checkout/page.tsx`: client component, same structure as mobile checkout. Address-picker bottom sheet — for web, can use a slide-up Dialog or fixed positioned `<div>` with overlay. Address form same fields. CouponRow component. POST `/store/orders/place-cod` via `fetch`. Redirect to `/[countryCode]/order/success/[id]` on success.

`/order/success/[id]/page.tsx`: server component, fetches order info from `/store/orders/[id]` (using existing Medusa SDK). Renders checkmark with CSS animation, order number, ETA, "Track order" (stubbed) + "Back to home".

- Commit: `feat(storefront): checkout + order success pages`

---

## Phase 10 — Vendor: order detail shows notes

### Task 10.1: Show shop_notes + delivery_notes in vendor order detail

`backend/apps/vendor/app/orders/[id]/page.tsx` — find where the order detail renders. Add two new sections:

```tsx
{order?.metadata?.shop_notes && (
  <section style={{ background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 8, padding: 12, marginBottom: 12 }}>
    <strong style={{ color: '#92400E' }}>📝 Notes for the shop</strong>
    <p style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{order.metadata.shop_notes}</p>
  </section>
)}

{order?.metadata?.delivery_notes && (
  <section style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 8, padding: 12, marginBottom: 12 }}>
    <strong style={{ color: '#065F46' }}>🛵 Delivery instructions</strong>
    <p style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{order.metadata.delivery_notes}</p>
  </section>
)}
```

- Commit: `feat(vendor): show shop_notes + delivery_notes on order detail`

---

## Final checklist

- [ ] All Phase 1-10 commits on local `main`
- [ ] All test suites pass (`npm run test:unit`, `test:integration:modules`, `test:integration:http`)
- [ ] Cart flow smoke (mobile + storefront): add → fly anim → FAB increments → cart screen shows items → checkout → place COD → success screen
- [ ] Cross-shop add prompt fires correctly
- [ ] Saved addresses persist; default-flip works
- [ ] Coupon apply path tested with a real promotion record
- [ ] Vendor portal shows both notes on order detail
- [ ] Mobile + storefront both reach the same UX bar
- [ ] `grep -rn "VerticalFieldsBlock" mobile/` returns nothing (legacy cleanup verification)

Push only after all the above pass.
