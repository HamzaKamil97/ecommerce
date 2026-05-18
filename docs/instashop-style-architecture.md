# Super-App Architecture (InstaShop-style)

Comprehensive plan for building an InstaShop-like multi-vertical marketplace where the **super-admin onboards shops/tenants**, each tenant has their **own admin dashboard** to manage their own products & orders, and the **mobile + web customer** experience adapts to each vertical (food, flowers, vegetables, electronics, fashion, pharmacy…).

## Reference comparison

InstaShop is a UAE/GCC super-app combining:
- **Restaurants** (food delivery, customizable menu, scheduled prep, delivery slots)
- **Grocery** (weight-based pricing, freshness, expiry)
- **Flowers** (occasion-based, delivery date selector, bouquet customization)
- **Pharmacy** (prescription handling, restricted items)
- **Electronics, Pets, Beauty, …**

Per shop: own branding (logo, banner, colors), own menu/catalog, own delivery times, own ratings. Customer can browse "by shop" or "by category" — both UX flows coexist.

## High-level architecture

```
                    ┌────────────────────────────────────┐
                    │       SUPER-ADMIN DASHBOARD        │  Next.js – approves
                    │ (Medusa Admin + custom Tenants)    │  tenants, monitors
                    └─────────────┬──────────────────────┘  marketplace health
                                  │
                                  ▼
        ┌─────────────────────────────────────────────────────────┐
        │              SHARED MEDUSA v2 BACKEND                   │
        │  Products · Categories · Orders · Cart · Auth · Region  │
        │                                                         │
        │  + Tenant module (each shop)                            │
        │  + Vendor module (shop's users)                         │
        │  + Approval module (product moderation)                 │
        │  + Vertical-fields module (food/flowers/pharmacy/…)     │
        │  + POS module (per-shop sync)                           │
        │  + AI module (search / descriptions / moderation)       │
        │  + Notification module (push/email/SMS)                 │
        │  + Delivery module (slot booking)                       │
        └──────────┬───────────────────┬──────────────────────────┘
                   │                   │
       Vendor Admin API           Public Store API
                   │                   │
        ┌──────────▼─────────┐ ┌───────▼────────────────────────┐
        │  VENDOR DASHBOARD  │ │   MOBILE APP & WEB STOREFRONT  │
        │  Next.js — each    │ │   (RN Expo + Next.js)          │
        │  tenant gets       │ │   "Shops" tab + "Categories"   │
        │  their own login   │ │   tab, per-vertical templates  │
        │  & scoped CRUD     │ │                                │
        └────────────────────┘ └────────────────────────────────┘
```

## Roles

| Role | Logs into | Permissions |
|---|---|---|
| **Customer** | Mobile app / Web storefront | browse, cart, order, review, manage profile |
| **Super-admin** | `/app` (Medusa Admin) + custom Tenants page | global products, approve tenants, override approvals, system config, billing |
| **Reviewer** | Reviewer dashboard (subset of Medusa Admin) | see `pending_review` products, approve/reject with note |
| **Vendor — Owner** | Vendor dashboard | create/edit own tenant's products, view own orders, see own analytics, manage own delivery slots |
| **Vendor — Staff** | Vendor dashboard (scoped) | edit products, update order status, no billing |
| **Delivery driver** | Driver mobile app (future) | accept/decline orders, mark picked up / delivered |

## Tenant lifecycle (super-admin flow)

1. Super-admin invites/creates a Tenant: slug, name, vertical, owner email
2. Tenant entity created with `approval_status: pending`
3. Sales Channel created in Medusa, linked via `tenant.sales_channel_id`
4. Owner receives invite email → sets password → logs into Vendor Dashboard
5. Owner completes onboarding: logo, banner, brand colors, delivery zones, payout info
6. Owner adds first products → each one starts in `draft` → submits for review
7. Reviewer approves → product becomes visible in customer apps under that tenant's sales channel
8. Super-admin can approve the Tenant itself (so it appears in "Shops" listing)
9. Optional: Tenant upgrades to **dedicated plan** → gets white-label mobile app (EAS Build) + custom-domain storefront

## Per-vertical templates

Each vertical extends the base Product with vertical-specific fields. A `Vertical` lives on the Tenant (and optionally the Product, for multi-vertical shops). The vendor's product-create UI changes based on the vertical:

| Vertical | Extra product fields | UI cue |
|---|---|---|
| **food** (restaurant) | prep_minutes, modifiers (`Pepperoni +$2`, `Extra cheese +$1`), spice_level, ingredients, allergens | "Customize" button, modifier groups |
| **grocery / vegetables** | unit (kg/g/ea), weight_per_unit, origin_country, organic, freshness_days, expiry_at | Weight slider, "Organic" badge |
| **flowers** | stem_count, vase_required, occasion_tags, delivery_date_required, message_card | Bouquet builder, date picker required |
| **electronics** | brand, model, specs (key/value), warranty_months, in_box_items | Spec table, warranty badge |
| **fashion** | sizes[], colors[], material, gender, fit_guide_url | Size selector, color swatch |
| **pharmacy** | requires_prescription, dosage, age_restriction, controlled | Prescription upload prompt, age gate |
| **pets** | species, breed, age_appropriate | Pet selector |
| **beauty** | skin_type, ingredients[], cruelty_free, vegan | Skin-type filter |

Implementation = one custom Medusa module **`vertical-fields`** with a polymorphic table:

```sql
vertical_product_fields(
  id, product_id, vertical, fields jsonb
)
```

Application layer renders the UI based on `tenant.vertical` (or product.vertical override).

## Customer mobile / web — two browsing modes

### Mode A — Browse by Shop (InstaShop home pattern)

```
┌─────────────────────────────────┐
│ Hello, Hamza 👋                 │
│ Deliver to: Hamra St, Beirut    │
│                                 │
│ [search]                        │
│                                 │
│ Categories: 🍔 🌹 🥕 🎧 👕 💊    │
│                                 │
│ Top shops near you              │
│ ┌─┐ ┌─┐ ┌─┐ ┌─┐                 │
│ │ │ │ │ │ │ │ │  ← shop cards   │
│ └─┘ └─┘ └─┘ └─┘                 │
│                                 │
│ Restaurants                     │
│ ┌─┐ ┌─┐ ┌─┐                     │
│ │ │ │ │ │ │   ← per-vertical    │
│ └─┘ └─┘ └─┘     rails           │
│                                 │
│ Groceries                       │
│ ┌─┐ ┌─┐ ┌─┐                     │
└─────────────────────────────────┘
```

Tap a shop → shop-specific storefront (own branding, only their products, own delivery rules).

### Mode B — Browse by Category

```
┌─────────────────────────────────┐
│ Shop ▾   Category ▾   Sort ▾    │
│                                 │
│ ┌──────┐ ┌──────┐               │
│ │ prod │ │ prod │               │
│ │ from │ │ from │   ← shows     │
│ │shopA │ │shopB │     tenant    │
│ └──────┘ └──────┘     badge     │
│ ┌──────┐ ┌──────┐               │
└─────────────────────────────────┘
```

Aggregated across all shops in that category. Customer sees the tenant name on each product.

### Cart model

InstaShop uses **per-shop cart** (Uber-Eats style): one cart per shop. Switching to a different shop prompts to clear or save the existing cart. Reasons: shipping/fulfillment lines up to one shop, payment splits cleanly, order tracking is per-shop.

Implementation in Medusa: each cart's `sales_channel_id` = the shop. Multiple active carts allowed per user; UI shows one at a time, plus a "saved carts" drawer.

## Push notifications & live order tracking

- Customer subscribes to FCM/APNs token on login (`POST /store/customers/me/push-token`).
- Backend notification module fires on `order.placed`, `order.preparing`, `order.out_for_delivery`, `order.delivered`.
- Tenant's vendor dashboard receives `new_order_received` push too.
- Order detail screen shows live status + ETA (driver app integration).

## Wallets, loyalty, promos (future phase)

- Wallet module — top-up balance, refunds-to-wallet.
- Loyalty module — earn points per order, redeem for discount.
- Promos module — Medusa native; per-tenant or platform-wide.

## Delivery slot booking

- Each tenant defines `delivery_zones[]` (polygons or postcode lists) + `delivery_windows[]` (Mon 9-12, 12-15, …).
- Customer picks address → backend computes available windows → frontend shows slot picker on flowers/grocery, ASAP for restaurants.
- Custom module **`delivery`** with `Zone`, `Window`, `Slot` (held during checkout to prevent over-booking).

## Payments

Phase 1: manual provider (cash on delivery).
Phase 2: Stripe Connect (marketplace flow) — platform takes commission, rest goes to tenant's connected Stripe account.
Phase 3: regional: HyperPay, Tap, PayTabs, MyFatoorah for MENA; iyzico for Turkey; Stripe globally.

## Driver app (future)

Separate Expo app. Drivers see orders dispatched to them, accept/reject, see pickup/dropoff, mark delivered. Backend dispatch module assigns drivers based on tenant zone + driver location.

## What's built now vs TODO

### Built today

- ✅ **Tenant module** — Tenant + Vendor models, CRUD admin routes, public lookup by slug.
- ✅ **Approval module** — ProductApproval + ApprovalAudit, admin approve/reject routes, subscriber on `product.created`.
- ✅ **AI module** — semantic search (stub embeddings), AI description (anthropic/openai/stub providers), auto-categorization, indexing subscriber.
- ✅ **POS module** — adapter pattern, sku mapping, sync/order logs, scheduled job.
- ✅ **Multi-category seed** — 5 verticals, 10 products.
- ✅ **Mobile app** — onboarding, hero, category chips, skeleton loaders, search, cart, checkout, orders, profile, auth.

### TODO (next sessions, prioritized)

| Priority | Item | Effort |
|---|---|---|
| P0 | Vendor portal app (Next.js) at `apps/vendor` — own login, scoped product CRUD, own orders | 2–3 days |
| P0 | `vertical-fields` module (per-vertical JSONB fields) + admin/store API for read/write | 1 day |
| P0 | Mobile: Shops tab + shop detail screen + per-vertical rails on home | 1 day |
| P0 | Wire `sales_channel_id` into all Store API calls in mobile to scope per-shop cart | 4 h |
| P1 | Delivery module — zones, windows, slot reservation | 2 days |
| P1 | Notification module — push tokens, FCM/APNs adapter, order-event subscribers | 1 day |
| P1 | Reviewer dashboard UI (Next.js or Medusa Admin extension) — pending queue, approve/reject UI | 1 day |
| P1 | Vendor onboarding wizard (logo, banner, colors, payout, delivery zones) | 1 day |
| P2 | Real AI: swap stub embeddings → pgvector + OpenAI text-embedding-3-small | 4 h |
| P2 | Stripe Connect for marketplace payouts | 2–3 days |
| P2 | Loyalty + wallet modules | 2 days |
| P3 | Driver app + dispatch module | 1 week |
| P3 | Multi-region/multi-currency at tenant level | 3 days |

## Code map (what to look at)

```
backend/apps/backend/src/
  modules/
    tenant/                ← shop entity + vendor entity
    approval/              ← product moderation
    ai/                    ← search + descriptions
    pos/                   ← external POS sync
    vertical-fields/       ← TODO — per-vertical custom fields
    delivery/              ← TODO — slot booking
    notification/          ← TODO — push/email/SMS
  api/
    admin/
      tenants/             ← super-admin tenant CRUD
      approvals/           ← reviewer endpoints
      ai/{describe,categorize}/
      pos/
    vendor/                ← TODO — vendor-scoped CRUD (auth = vendor JWT)
    store/
      tenants/[slug]       ← public tenant lookup
      search/              ← semantic search
```

```
mobile/
  app/
    onboarding.tsx
    (tabs)/{index,cart,orders,profile,shops}.tsx     ← TODO: shops.tsx
    shops/[slug].tsx                                  ← TODO
    products/[id].tsx
    auth/{login,register}.tsx
    checkout.tsx, order-success.tsx
  src/
    api/{products,cart,auth,categories,shops}.ts     ← TODO: shops.ts
    components/{ProductCard,CategoryChip,Skeleton,…}.tsx
    store/{authStore,cartStore}.ts
    theme/
    types/
```

```
backend/apps/
  storefront/              ← Next.js customer web (medusajs starter base)
  vendor/                  ← TODO — Next.js vendor admin (scoped)
```

## Design principles I'm sticking to

1. **One backend, many surfaces** — mobile, customer web, vendor web, future driver app all share the same Medusa instance.
2. **Tenants = SalesChannels** — leverages Medusa's native scoping for free. No re-inventing.
3. **Per-vertical UI, not per-vertical schema** — base Product schema stays simple; verticals add JSONB fields via one extension module. New verticals = new template, no migration.
4. **Default-deny moderation** — vendor products start `draft`/`pending_review`. Only `approved` is publicly served.
5. **AI as opt-in extras** — every AI call has a `stub` provider that works without external API keys. Switch to Anthropic/OpenAI by setting one env var.
6. **Carts are per-shop** — InstaShop pattern. Simpler shipping/payment splits, clearer customer mental model.
