# Multi-Tenant + Multi-Category Architecture

## Goals

1. **Multi-category super-app** — one platform serving many verticals: food, roses, vegetables, electronics, fashion, etc. Each vertical may have category-specific attributes and UX.
2. **Per-tenant dedicated apps** — individual shops can opt into a white-label package: their own mobile app + own web storefront on their own domain, with their branding.

## Recommended pattern: **Hybrid** (marketplace + white-label SaaS tier)

### Core platform (marketplace)
- One Medusa v2 backend, one Postgres, one shared infrastructure.
- Each tenant = one Medusa **Sales Channel** (Medusa's native tenant primitive).
- Each tenant's products are scoped to its Sales Channel.
- The super-app (default mobile + Next.js storefront) lists all tenants' products.

### Tenant model (Medusa custom module)

```ts
// Custom module: tenants
interface Tenant {
  id: string;                    // uuid
  slug: string;                  // url-safe: 'green-roses', 'fresh-veggies'
  name: string;                  // 'Green Roses Co.'
  sales_channel_id: string;      // FK to Medusa SalesChannel
  vertical: 'food' | 'flowers' | 'vegetables' | 'electronics' | 'fashion' | 'general';
  branding: {
    logo_url: string;
    primary_color: string;
    secondary_color: string;
    font?: string;
  };
  domain?: string;               // for dedicated tier: 'shop.example.com'
  plan: 'marketplace' | 'dedicated';
  vendor_user_ids: string[];     // FK to users with vendor role
  approval_status: 'pending' | 'approved' | 'suspended';
  created_at: Date;
}
```

### Per-vertical custom fields

Each vertical extends the base Product entity via metadata or a linked module:

| Vertical | Extra fields | UI hints |
|---|---|---|
| Food | `expiry_at`, `ingredients[]`, `nutrition`, `delivery_slot_window` | Calendar slot picker, allergen badges |
| Flowers | `stem_length_cm`, `vase_required`, `freshness_days`, `bouquet_size` | Bouquet builder |
| Vegetables | `unit` (kg/g/each), `origin`, `organic`, `harvest_date` | Weight slider for kg-priced items |
| Electronics | `brand`, `model`, `specs{}`, `warranty_months` | Spec table |
| Fashion | `size_chart`, `color_variants`, `material` | Size selector, color swatches |

Implementation: a Medusa custom module per vertical, linked to Product by `product_id`. Public Store API exposes the appropriate fields based on the product's `vertical`.

### Public Store API filtering

```ts
// GET /store/products?sales_channel_id=...  (Medusa-native, already works)
// GET /store/products?vertical=food         (custom extension)
```

When the mobile/web client knows it's running as a tenant-dedicated app, it always passes that tenant's `sales_channel_id` so listings only show that tenant's products.

## Tier 1 — Marketplace plan (super-app)

What the customer sees:
- Default mobile + web app
- Browse all tenants ("Shops" tab) or all categories
- One cart can span tenants (or one cart per tenant — choose at design time)
- One account, one order history across tenants

Backend:
- All tenants in one Medusa instance
- Order routing by Sales Channel (Medusa native)
- Payouts to tenants via vendor wallet module (custom)

## Tier 2 — Dedicated plan (white-label per tenant)

What the customer of *that* tenant sees:
- Tenant-branded mobile app (own logo, colors, name in stores)
- Tenant-branded web storefront at custom domain
- App acts as if it's a one-shop ecommerce app — no "marketplace" framing

Build pipeline:
- Single mobile codebase (`mobile/`) with dynamic config:
  ```ts
  // mobile/app.config.ts reads EXPO_PUBLIC_TENANT_SLUG at build time
  // Branding loaded from /store/tenants/by-slug/:slug at runtime
  ```
- One EAS Build profile per tenant (`production.tenant-green-roses`, etc.)
- Next.js storefront: same codebase, deployed per tenant with `NEXT_PUBLIC_TENANT_SLUG`
- Tenant domain points to their Next.js deployment

### Tenant onboarding (dedicated tier)

1. Shop owner signs up via vendor flow.
2. Configures branding (logo, colors, name).
3. Adds custom domain (DNS verification step).
4. Platform admin approves the dedicated plan.
5. CI runs `eas build --profile tenant.<slug>` for iOS+Android.
6. CI deploys Next.js storefront to Vercel/own infra under tenant domain.
7. Shop owner gets store links + app build URLs.

## Phasing

| Phase | Deliverable | Why |
|---|---|---|
| 1 (current MVP) | Single sales channel, no tenants — just shopper app + admin | Validate flow |
| 2 | Add Tenant module + Sales Channel-per-tenant. Super-app shows shops. | Multi-vertical foundation |
| 3 | Vertical custom fields (food, flowers, etc.) | Category-specific UX |
| 4 | White-label config (dynamic branding via tenant slug) | Dedicated tier MVP |
| 5 | Per-tenant EAS Build pipeline + custom domains | Full white-label |
| 6 | Vendor payout / wallet module | Marketplace economics |

## Open questions for later

- **Single shared cart vs per-tenant cart** — Amazon-style one cart vs Uber-Eats-style per-restaurant cart. Decision depends on shipping/fulfillment model.
- **Tenant-level payment splits** — Stripe Connect for marketplace, direct merchant Stripe for dedicated.
- **Search across tenants vs scoped** — super-app should search across; dedicated app must scope.
