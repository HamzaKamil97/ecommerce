# SP-B: Cart & Checkout UX Rebuild — Design Spec

**Status:** Draft
**Date:** 2026-05-19
**Parent milestone:** First-customer launch v0
**Position in roadmap:** Sub-project B of 7. Depends on SP-A (taxonomy + merch). Builds on existing CartFab and PriceText (from earlier phases).

---

## Goal

Rebuild the cart flow end-to-end: fly-to-cart animation on add, persistent one-shop-active cart with cross-shop add-prompt, redesigned cart screen with working +/− steppers and product navigation, single-page COD checkout with saved-addresses picker (Talabat pattern), and an order-placed success screen.

## Why this exists

User feedback 2026-05-18 (items 1, 5, 6):

- Item 1: "I didn't like the animation of add (+). I prefer to have cart which should be popped up when you add and the item go to it"
- Item 5: "Cart is so bad. Photos not showing sometimes, items getting above the page. The − (decreasing) not working well. Item can't be clicked to go to the store. No 'add new' which should back to the store. Preferred for time being the cart will be per the store order."
- Item 6: "Categories will be based on store. Tap item → go to store page → add to cart per store. If go to another store, start new (remove old)."

Plus the user's added requirement during SP-B brainstorm: special order notes + saved-addresses picker on checkout.

## Architecture overview

Cart is client-side state (Zustand store on mobile, React Context on storefront), persisted across navigation. Carts are **one-shop-active**: only one shop's items can be in the cart at a time. Switching shops while browsing leaves the cart untouched — the cart only clears (with user consent) when the customer attempts to **add** an item from a different shop.

Adding triggers a fly-to-cart animation: an animated clone of the product image scales up, flies along a Bézier curve to the CartFab, the FAB pulses on landing, and the count badge increments.

Cart screen (`/cart` on mobile and storefront) is a full-screen route showing line items with +/− steppers, total summary, and a sticky bottom Checkout button.

Checkout is a single-page form: address picker (Talabat-style saved list + "Add new" sheet), order notes, payment method (COD only — fixed for v0), summary, and place-order button. Submit creates a Medusa order via cash-on-delivery, then routes to a success screen.

A new `customer_address` storage exists (per-customer saved addresses) — basic save/select for now; full management (edit, delete, set default) defers to SP-D.

The same `DetailsPanel` / `ProductCard` components from SP-A serve product pages — no per-industry branching. The cart row also stays generic (image, title, qty, price) regardless of shop vertical.

## Data model

### Cart store (client-side, no DB)

```typescript
interface CartItem {
  product_id: string
  variant_id: string
  title: string
  thumbnail: string | null
  unit_price_minor: number
  currency_code: "iqd" | "usd"
  qty: number
  // For navigation back to product detail
  product_handle: string
}

interface CartState {
  shop_slug: string | null
  shop_name: string | null
  shop_display_currency: "IQD" | "USD"
  items: CartItem[]
  /** "Notes for the shop" — meal prep prefs, allergy reminders, etc. Captured on the cart screen, visible to the shop. */
  shop_notes: string
  /** "Delivery instructions" — captured on checkout (rider-facing). */
  delivery_notes: string
  /** Optional coupon code entered at checkout. Applied/validated server-side at order placement. */
  coupon_code: string | null
  // Derived (not stored, computed in selectors)
  // itemCount: number
  // subtotal_minor: number
  // discount_minor: number (after coupon validation)
}
```

Mobile: extend the existing Zustand `useCartStore`. Storefront: extend the existing cart Context or create one if absent.

### Customer addresses (new server-side table)

```
customer_address
─────────────────────────────────────
id                text  pk
customer_id       text  fk customer.id, indexed
label             text  e.g. "Home", "Office"
recipient_name    text
phone             text
country           text  default "IQ"
city              text  e.g. "Baghdad"
area              text  optional e.g. "Karrada"
street            text
building          text  optional
floor             text  optional
notes             text  optional ("blue gate near pharmacy")
is_default        boolean default false
created_at, updated_at, deleted_at
```

New module: `src/modules/customer-address/`. Owns the table + service. Service exposes:
- `listForCustomer(customerId): CustomerAddress[]` (ordered by is_default desc, created_at desc)
- `getById(id): CustomerAddress | null` (with tenant-of-customer check enforced at the API layer)
- `createForCustomer(customerId, data): CustomerAddress`
- `markDefault(id): void` — flips other addresses to is_default=false within the same customer
- `softDelete(id): void`

(Full SP-D will add an admin-style "edit address" UI, but the underlying service supports it from day one.)

### Order placement

Uses the existing Medusa cart + order workflow. New thin wrapper workflow `placeCodOrderWorkflow` that:
1. Builds a draft cart for the customer
2. Adds items from the client-side cart
3. Sets shipping address from the chosen `customer_address` (or freshly created one)
4. Sets payment provider = `system` (Medusa's built-in "manual" provider — used for COD)
5. Completes the cart → order
6. Returns `{ order_id, display_id }`

## API surface

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/store/customers/me/addresses` | customer | List the calling customer's addresses |
| POST | `/store/customers/me/addresses` | customer | Create a new address |
| POST | `/store/customers/me/addresses/:id/default` | customer | Mark as default |
| DELETE | `/store/customers/me/addresses/:id` | customer | Soft-delete |
| POST | `/store/orders/place-cod` | customer | Atomic: build cart from request body + chosen address_id, place order, return order info |

Body for `/store/orders/place-cod`:
```json
{
  "shop_slug": "hamzas-kitchen",
  "address_id": "addr_01...",     // OR inline_address: {...}
  "inline_address": null,
  "items": [
    { "variant_id": "vrnt_01...", "qty": 2 }
  ],
  "shop_notes": "No onions on the burger",
  "delivery_notes": "Blue gate near pharmacy, ring bell twice",
  "coupon_code": "HANOOT10"
}
```

The two notes fields are stored on the order: `shop_notes` is surfaced to the shop in the vendor portal (kitchen-facing), `delivery_notes` is surfaced to the rider in the delivery flow. If the coupon code is invalid or expired, the request returns 400 with a clear error.

If `inline_address` is provided (one-shot, save=true), the address is also created server-side before being used.

## UI design

### Cart FAB (existing — minor enhancement)

- Already implemented in mobile + storefront.
- Add: **pulse animation** when items land (CSS scale-up + bounce-back, ~300ms).
- Already shows count badge from store state.

### Fly-to-cart animation

**Mobile (React Native + Reanimated):**

```tsx
// Pseudocode shape
function addToCartWithAnimation(productImageRef: View, productData: CartItem) {
  // 1. Measure source (productImageRef.measureInWindow) and target (FAB position)
  // 2. Create a ghost View positioned absolutely at source
  // 3. Animate scale 1 → 0.6, translate via Bézier to FAB position, then scale → 0
  // 4. On animation end: useCartStore.add(productData) — triggers FAB pulse
}
```

Uses `react-native-reanimated` `withTiming` + `withSequence` for the path. The target position is computed via a shared ref on the FAB so it stays correct even when nav state changes.

If `react-native-reanimated` isn't already a dep, fall back to vanilla `Animated.View` (slightly less smooth, still acceptable).

**Storefront (CSS):**

```css
/* The flying clone */
.fly-clone {
  position: fixed; pointer-events: none; z-index: 9999;
  transform-origin: top left;
  transition: transform 400ms cubic-bezier(.34,1.56,.64,1), opacity 400ms;
}
```

JS computes source rect (product image) and target rect (FAB), then sets `transform: translate(targetX-sourceX, targetY-sourceY) scale(0)` and removes after transition.

### Cross-shop add prompt

When `addItem(product)` is called and `cart.shop_slug !== product.shop_slug && cart.items.length > 0`:

Modal:
> **Start a new basket?**
> Your basket has items from **Hamza's Kitchen**.
> Adding from **FreshMart** will clear those items.
>
> [Cancel] [Clear and add]

"Cancel" → close, no change.
"Clear and add" → wipe cart, set `shop_slug` to new shop, add the new item, trigger animation.

### Cart screen `/cart`

**Header (sticky):**
```
‹ Back     Your basket
           Hamza's Kitchen
```

**Item rows (vertical list):**
```
┌──────────────────────────────────────────┐
│ ┌────┐                                   │
│ │img │ Margherita Pizza                  │
│ └────┘ 15,000 IQD                        │
│        ┌────┬───┬───┐         15,000 IQD │
│        │ −  │ 1 │ + │                    │
│        └────┴───┴───┘         🗑          │
└──────────────────────────────────────────┘
```
- Tap image or title → product detail
- Tap qty stepper +/− → updates store; − at 1 removes (with confirm tap) or shows the 🗑 button
- 🗑 trash icon on right → removes item with brief undo toast
- Line total recomputes live

**Empty state:**
```
🛒
Your basket is empty
[Browse shops]
```

**Sticky bottom:**
```
Subtotal           15,000 IQD
Delivery fee        2,500 IQD
─────────────────────────────
Total              17,500 IQD

[ Checkout · 17,500 IQD ]
```

**Top-right "+":** "Add more from this shop" — navigates back to the shop page.

**Notes for the shop (above summary, optional):**
- Textarea labeled "Notes for the shop"
- Placeholder: "No onions, cut in 8 slices, allergies, etc."
- Stored in cart state; sent to the order as `shop_notes`. Visible in vendor portal kitchen-facing order view.

### Checkout screen `/checkout`

Single page with clear sections:

**1. Deliver to**
- If saved addresses exist: card with selected address + chevron. Tap → bottom sheet listing saved addresses (radio) + "Add new address" link. Default address selected by default.
- If zero saved addresses: inline form (name, phone, city, area, street, building, floor, notes). "Save for next time" checkbox checked by default.

**2. Delivery instructions (optional)**
- Free-text textarea, placeholder: "Blue gate near pharmacy, call when arrived, etc."
- Rider-facing — distinct from "Notes for the shop" set on the cart screen.

**3. Coupon code (optional, collapsible)**
- Default state: collapsed link "Have a coupon code?" with a chevron.
- Expanded: small input + "Apply" button on the right.
- On Apply: POST `/store/promotions/validate` (existing endpoint) with the code + subtotal + currency. On success, the discount row appears in the summary with a remove (×) affordance. On failure, inline error: "Code invalid" / "Code expired" / etc.

**4. Payment method**
- Single non-selectable card: "💵 Cash on Delivery" with a check icon. Subtext: "Pay the rider on delivery."

**5. Summary**
- Item count: `2 items from Hamza's Kitchen`
- Subtotal · (Discount, if coupon applied — green text, negative number) · Delivery fee · **Total**

**Sticky bottom:**
- `[ Place order · 17,500 IQD ]` — disabled until valid address present
- On submit: spinner, then either error toast or navigate to success screen

### Address picker bottom sheet

```
─────────────────────────────────────
 Choose delivery address           ×
─────────────────────────────────────
 ◉  Home · Karrada
    Hamza Kamel · +964 750 123 4567
    Building 12, apartment 4
─────────────────────────────────────
 ○  Office · Mansour
    Hamza Kamel · +964 750 123 4567
    Tower 3, floor 7
─────────────────────────────────────
 + Add new address
─────────────────────────────────────
```

Tap radio → updates `selected_address_id` and closes sheet.
Tap "Add new" → swaps sheet content to the inline form. Save → address created, becomes the selected one, sheet closes.

### Success screen `/order/success/[id]`

```
        ✓ (big checkmark, brand teal, scale-in animation)

        Order placed
        
        Order #A1B2C3
        Hamza's Kitchen
        Arriving in 25–35 min

        ─────────────────────
        2 items · 17,500 IQD

        [ Track order ]       (button — stubbed, will work in SP-F)
        [ Back to home ]      (link)
```

Cart is cleared after successful order.

## Workflows

- **`placeCodOrderWorkflow`** wraps Medusa core flows to create a cart, add line items, set address + payment, complete order. Atomic — if any step fails, no order is created.

Standard Medusa cart workflows (`createCartWorkflow`, `addToCartWorkflow`, `setPaymentSessionsWorkflow`, `completeCartWorkflow`) are composed inside.

## Multi-industry coherence rule

Cart row uses the same component for food / clothes / electronics — only data differs. Address picker, checkout form, success screen — none of them have per-industry variation. Same components, same layout, same color tokens.

## Out of scope (explicit)

- Card payment / ZainCash / Qi Card / Stripe — defer to a later sub-project (SP-Payment).
- Full address-book CRUD UI (edit, delete, label-while-saved) — basic save + select only in SP-B. Full UI is SP-D.
- Order tracking screen (timeline of placed → preparing → on the way → delivered) — SP-F. SP-B's "Track order" button just navigates to a placeholder.
- Promotions / coupons at checkout — defer.
- Cart sharing / save-for-later — defer.
- Tipping — defer.
- Schedule for later / future orders — defer.
- Group orders / multi-customer — defer.

## Testing approach

1. **Cart store unit tests** (mobile + storefront): add item, increment qty, decrement, cross-shop add prompt logic, cart clear, persistence across navigation.
2. **`customer-address` service integration tests:** create, list, mark default flips others, soft-delete, tenant-of-customer isolation.
3. **`placeCodOrderWorkflow` integration tests:** happy path creates order with correct items + address + payment provider; failure rolls back; verifies cart is cleared on success.
4. **API contract tests:** each new endpoint with valid + invalid input.
5. **Mobile screen smoke (Expo Go):** Tap + on a product → animation runs → FAB count increments. Open cart → items list correctly. Stepper works. Tap image → product detail. Checkout → enter address → place order → success screen.
6. **Storefront smoke (browser):** same flow on web.
7. **Cross-shop add prompt:** add from Shop A, tap + on Shop B product, confirm modal, click "Clear and add" → cart now has Shop B only.

Every "done" gate runs at least one of these verifications.

## Effort estimate

- Cart store extensions (mobile + storefront): **~1 day**
- Fly-to-cart animation (mobile reanimated + web CSS): **~1.5 days**
- Cross-shop prompt modal: **~0.5 day**
- Cart screen rebuild (both platforms): **~2 days**
- `customer-address` module + migration: **~1 day**
- Customer-addresses API routes + tests: **~1 day**
- Checkout screen + address picker bottom sheet: **~2.5 days**
- `placeCodOrderWorkflow` + tests: **~1.5 days**
- `/store/orders/place-cod` route + tests: **~1 day**
- Success screen: **~0.5 day**
- Mobile + storefront smoke: **~1 day**
- Vendor portal "view shop's cart-per-customer" — out of scope here

**Total: ~13 working days (~2.5 weeks calendar).**

## Success criteria

1. Add from Shop A → cart FAB animates with image-fly. Count increments.
2. Tap FAB → cart screen lists item with image, title, qty stepper, line total.
3. Tap + in stepper → qty increments. Tap − at qty=1 → item removed.
4. Tap item image/title → product detail page.
5. Navigate to Shop B (cart still has Shop A items). Tap + on Shop B product → confirm modal. Click "Clear and add" → cart now has Shop B item only.
6. Cart with 1+ items → tap Checkout → checkout screen renders inline address form (first-time customer).
7. Submit checkout with valid address + COD → success screen with order number. Order appears in admin.
8. Second order from same customer → address picker shows saved address as default-selected. Tap → bottom sheet with "Add new" option.
9. Empty cart → empty state with "Browse shops" CTA.
10. `shop_notes` from cart screen and `delivery_notes` from checkout captured separately and visible in admin / order detail.
11. Coupon flow: apply valid code → discount appears in summary. Apply invalid code → inline error, no state change.

## Open questions / deferred

- Currency mismatch: what if the cart is in USD (Style Hub) and customer wants to switch to IQD shop (Hamza's)? → Cross-shop prompt covers it (clear cart). No mixed-currency cart.
- Delivery fee: per-shop static for v0 (each shop has a `delivery_fee_iqd` setting). Distance-based fee is future work.
- Cart persistence across app launches: localStorage on web, AsyncStorage on mobile — store hydration is required so cart survives close+reopen within a session.
