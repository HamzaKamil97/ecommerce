# SP-1.3 — Talabat-style home grids (design only)

Status: design draft, no code yet
Owner: mobile home screen (`mobile/app/(tabs)/index.tsx`)
Constraint sources: `feedback-phone-test-2026-05-19` (super-admin owns home placement), `feedback-multi-industry-coherence` (one set of components across 5 verticals), `feedback-copy-proven-ecom-patterns` (copy Talabat / InstaShop / Toters / Amazon).

The home screen today hard-codes section order in JSX. This doc proposes a **layout-driven home** built from a small set of composable section components, where the section list, ordering, and any promoted slots are eventually authored in a super-admin surface and consumed read-only by the mobile app.

---

## 1. Section taxonomy

Every section the mobile home screen should be able to render. All sections also work on the shops list screen and category landing pages — only the source data changes.

| # | Section type           | One-liner                                                                                                         | Where it renders                          | Data shape (high-level)                          | Refresh policy                            |
|---|------------------------|-------------------------------------------------------------------------------------------------------------------|-------------------------------------------|--------------------------------------------------|-------------------------------------------|
| 1 | `hero_carousel`        | Full-width swipeable banner slides (current `HeroBanner`).                                                        | Home                                      | `HeroSlide[]`                                    | Per app open; admin can swap any time     |
| 2 | `category_grid`        | Vertical chips/icons row (current `CategoriesCarousel`).                                                          | Home, category landing                    | `Category[]`                                     | Static; admin edits rarely                |
| 3 | `vertical_chip_strip`  | Horizontal sub-vertical filter chips ("Burgers, Breakfast, Shawarma…") for one parent vertical.                   | Home (when vertical is filtered), Shops   | `{ parentVertical, chips: VerticalChip[] }`      | Static per vertical                       |
| 4 | `order_again_strip`    | Shop-logo row of shops the user has ordered from before (horizontal, swipe).                                      | Home, Account                             | `Shop[]` (subset, ordered by last-order recency) | On user state change / app focus          |
| 5 | `inspired_by_past`     | Mixed grid of shop logos + product cards together, derived from the user's order history.                        | Home                                      | `GridItem[]` where `GridItem = ShopItem \| ProductItem` | On user state change                |
| 6 | `picks_for_you_row`    | Horizontal row of product cards framed "Picks for you 🔥" (current `ForYouCarousel`, retitled).                   | Home                                      | `ForYouRecommendation[]`                         | On user state change; reranks per session |
| 7 | `category_product_row` | "Most popular in {category}" — horizontal product cards filtered to a category/vertical.                          | Home, category landing                    | `{ categoryHandle, products: Product[] }`        | Daily                                      |
| 8 | `featured_shops_row`   | Horizontal shop cards with cover image (current `FeaturedShopsCarousel`).                                          | Home, Shops list                          | `Shop[]`                                         | Editorial, admin-curated                  |
| 9 | `promoted_shops_slot`  | Identical visual to `featured_shops_row` (or `order_again_strip`), but items are **paid placements**. Each item carries a `sponsored: true` flag and renders a small "Promoted" pill. | Home, Shops list, category landing | `Shop[]` with sponsorship metadata | Admin/campaign-driven (date-bounded) |
|10 | `deals_row`            | Image-card carousel of promotions (current `DealsCarousel`).                                                       | Home                                      | `Deal[]`                                         | Editorial                                  |
|11 | `active_baskets_strip` | "Continue shopping" — shops the user has live carts with (current `ActiveBasketsCarousel`).                       | Home (conditional, render only if any)    | `Basket[]`                                       | Live (cart store)                         |
|12 | `promo_strip`          | Full-width single-line promo (current `PromoStrip`).                                                              | Home                                      | `{ icon, headline, subtext, bg }`                | Editorial                                  |
|13 | `nearby_shops_list`    | Vertical list of shop rows (current `ShopRow[]`).                                                                  | Home (bottom), Shops list                 | `Shop[]`                                         | Per location change                        |

A "section" is always: `SectionHeader` (optional) + body. Body is one of: shop-logo strip, mix-grid, product-card row, image-card row, vertical list, banner. Five body shapes total — see §2.

---

## 2. Component decomposition

Five new components. They cover every section in §1 by composition, not by per-section duplication. All components are pure-presentational; they take typed props and emit `onPress`/`onAdd` callbacks. They never know if their data came from mock JSON or a real endpoint.

| File path                                                              | One-line description                                                                                                                                                  |
|------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `mobile/src/components/home/ContentSection.tsx`                        | Router/wrapper. Takes a `HomeSlot` from layout, renders the optional `SectionHeader` and dispatches to the correct body component by `slot.type`. The home screen only ever renders this. |
| `mobile/src/components/home/ShopLogoStrip.tsx`                         | Horizontal scrollable row of circular shop logos with name underneath. Used for `order_again_strip`, `promoted_shops_slot` (logo variant), and the logo half of `inspired_by_past`. |
| `mobile/src/components/home/MixGrid.tsx`                               | 2-column grid that renders a heterogeneous list of `GridItem` (either `ShopItem` or `ProductItem`). Used for `inspired_by_past`. Each cell decides its own layout internally. |
| `mobile/src/components/home/ProductCardRow.tsx`                        | Horizontal row of product cards with image, title, price, quick-add button. Used for `picks_for_you_row`, `category_product_row`. Replaces the bespoke `ForYouCarousel` body. |
| `mobile/src/components/home/PromotedPill.tsx`                          | Tiny rounded "Promoted" pill (token-driven, `surfaceAlt` bg + `textMuted` text). Overlaid by `ShopLogoStrip` / `MixGrid` / `ProductCardRow` / featured-shop cards when `item.sponsored === true`. |

Existing components (`HeroBanner`, `CategoriesCarousel`, `FeaturedShopsCarousel`, `DealsCarousel`, `PromoStrip`, `ActiveBasketsCarousel`, `ShopRow`, `SectionHeader`) are **kept as-is** and become body renderers `ContentSection` dispatches to. We don't rewrite working code; we wrap it.

Prop signatures (TS shape, no implementation):

```ts
// ContentSection — the only thing home.tsx renders inside the ScrollView
interface ContentSectionProps {
  slot: HomeSlot                       // from layout (see §3)
  onItemPress?: (item: SlotItem) => void
  onAddToCart?: (productId: string) => void
}

// ShopLogoStrip
interface ShopLogoStripProps {
  shops: Array<{ slug: string; name: string; logoUrl: string; sponsored?: boolean }>
  onPress: (slug: string) => void
}

// MixGrid
type GridItem =
  | { kind: 'shop'; slug: string; name: string; logoUrl: string; coverUrl?: string; sponsored?: boolean }
  | { kind: 'product'; id: string; title: string; thumbnail: string; priceMinor: number; currency: 'iqd' | 'usd'; shopSlug: string; sponsored?: boolean }

interface MixGridProps {
  items: GridItem[]
  onPressItem: (item: GridItem) => void
  onAddProduct?: (productId: string) => void
}

// ProductCardRow
interface ProductCardRowProps {
  products: Array<{
    id: string
    title: string
    thumbnail: string
    priceMinor: number
    currency: 'iqd' | 'usd'
    shopName?: string
    sponsored?: boolean
  }>
  onPress: (productId: string) => void
  onAdd?: (productId: string) => void
}

// PromotedPill
interface PromotedPillProps {
  label?: string   // default: t('home.promoted')
  size?: 'sm' | 'md'
}
```

All visuals come from `tokens.colors`, `tokens.spacing`, `tokens.radius`, `tokens.fontSize`. No new colors.

---

## 3. Data model — `HomeLayout`

A single read-only document that fully describes the home screen. The mobile screen renders `layout.slots.map(...)` and nothing else; it never branches on section identity at the screen level.

```ts
// mobile/src/lib/home/layoutTypes.ts (path proposed — created in SP-1.3)

export type SlotType =
  | 'hero_carousel'
  | 'category_grid'
  | 'vertical_chip_strip'
  | 'order_again_strip'
  | 'inspired_by_past'
  | 'picks_for_you_row'
  | 'category_product_row'
  | 'featured_shops_row'
  | 'promoted_shops_slot'
  | 'deals_row'
  | 'active_baskets_strip'
  | 'promo_strip'
  | 'nearby_shops_list'

export interface ContentSource {
  // How the body data is resolved at render time.
  kind:
    | 'static'           // payload embedded inline (banners, promo strip)
    | 'mock'             // pulled from a named mock key (current DEMO_* arrays)
    | 'endpoint'         // fetched from backend: GET /store/home-sources/{key}
    | 'derived'          // computed client-side (order_again, active_baskets, inspired_by_past)
  key?: string           // mock key OR endpoint key
  payload?: unknown      // for kind === 'static'
  filter?: {             // optional narrowing applied client-side
    vertical?: string
    categoryHandle?: string
    limit?: number
  }
}

export interface SponsorshipMeta {
  campaignId: string
  advertiserShopSlug: string
  startsAt: string       // ISO
  endsAt: string         // ISO
  label?: string         // override "Promoted" copy if needed
}

export interface HomeSlot {
  id: string                       // stable, admin-authored id (e.g. 'home.order_again.v1')
  type: SlotType
  title?: { en: string; ar: string } | null   // null = no header
  actionLabel?: { en: string; ar: string } | null
  actionRoute?: string             // expo-router path, used when actionLabel present
  source: ContentSource
  sponsorship?: SponsorshipMeta    // only present on promoted_shops_slot, etc.
  visibleIf?: {                    // optional render guards
    auth?: 'required' | 'guest_ok'
    nonEmpty?: boolean             // hide section if source resolves to []
    locale?: Array<'en' | 'ar'>
  }
}

export interface HomeLayout {
  version: number                  // bumped each time super-admin publishes
  publishedAt: string              // ISO
  defaultLocale: 'en' | 'ar'
  slots: HomeSlot[]
}
```

### Storage

- **Today (SP-1.3):** ship `mobile/src/lib/home/mockLayout.ts` exporting a `DEFAULT_HOME_LAYOUT: HomeLayout` constant. Resolvers in `mobile/src/lib/home/resolveSource.ts` read `kind: 'mock'` slots from existing `DEMO_*` arrays in `components/home/demo-data.ts`.
- **SP-2.x:** introduce backend endpoint `GET /store/home-layout` (returns `HomeLayout`) and `GET /store/home-sources/:key` for `kind: 'endpoint'` slots. Mobile uses a single hook `useHomeLayout()` with React-Query that falls back to the embedded mock on network error so the home screen never blanks out.
- **SP-3.x (super-admin):** authoring UI in the future super-admin app writes to `home_layout` table; backend serves the latest published version. The vendor portal is **not** involved.

### Sample populated `HomeLayout` (recreates today's home + 3 new Talabat sections, including one promoted)

```json
{
  "version": 1,
  "publishedAt": "2026-05-20T08:00:00Z",
  "defaultLocale": "en",
  "slots": [
    {
      "id": "home.hero.v1",
      "type": "hero_carousel",
      "title": null,
      "source": { "kind": "mock", "key": "DEMO_SLIDES" }
    },
    {
      "id": "home.categories.v1",
      "type": "category_grid",
      "title": null,
      "source": { "kind": "mock", "key": "DEMO_CATEGORIES" }
    },
    {
      "id": "home.order_again.v1",
      "type": "order_again_strip",
      "title": { "en": "Order again", "ar": "اطلب مرة أخرى" },
      "actionLabel": { "en": "See all", "ar": "عرض الكل" },
      "actionRoute": "/orders",
      "source": { "kind": "derived", "key": "order_again", "filter": { "limit": 10 } },
      "visibleIf": { "auth": "required", "nonEmpty": true }
    },
    {
      "id": "home.picks_for_you.v1",
      "type": "picks_for_you_row",
      "title": { "en": "Picks for you 🔥", "ar": "مختاراتك 🔥" },
      "actionLabel": { "en": "See all", "ar": "عرض الكل" },
      "actionRoute": "/(tabs)/shops",
      "source": { "kind": "mock", "key": "DEMO_FOR_YOU" }
    },
    {
      "id": "home.active_baskets.v1",
      "type": "active_baskets_strip",
      "title": { "en": "Continue shopping", "ar": "متابعة التسوق" },
      "source": { "kind": "derived", "key": "active_baskets" },
      "visibleIf": { "nonEmpty": true }
    },
    {
      "id": "home.featured_shops.v1",
      "type": "featured_shops_row",
      "title": { "en": "Featured shops", "ar": "متاجر مميزة" },
      "actionLabel": { "en": "See all", "ar": "عرض الكل" },
      "actionRoute": "/(tabs)/shops",
      "source": { "kind": "mock", "key": "DEMO_SHOPS", "filter": { "limit": 3 } }
    },
    {
      "id": "home.promoted_shops.may2026.v1",
      "type": "promoted_shops_slot",
      "title": { "en": "Trending near you", "ar": "رائج بالقرب منك" },
      "source": { "kind": "endpoint", "key": "promoted_shops" },
      "sponsorship": {
        "campaignId": "camp-2026-05-baghdad-burgers",
        "advertiserShopSlug": "hamzas-kitchen",
        "startsAt": "2026-05-15T00:00:00Z",
        "endsAt": "2026-05-31T23:59:59Z"
      }
    },
    {
      "id": "home.popular_breakfast.v1",
      "type": "category_product_row",
      "title": { "en": "Most popular in breakfast", "ar": "الأكثر شعبية في الإفطار" },
      "actionLabel": { "en": "See all", "ar": "عرض الكل" },
      "actionRoute": "/(tabs)/shops?vertical=food&meal=breakfast",
      "source": { "kind": "mock", "key": "DEMO_PRODUCTS_BY_SHOP", "filter": { "categoryHandle": "breakfast", "limit": 10 } }
    },
    {
      "id": "home.inspired_by_past.v1",
      "type": "inspired_by_past",
      "title": { "en": "Inspired by your past orders", "ar": "مستوحى من طلباتك السابقة" },
      "source": { "kind": "derived", "key": "inspired_by_past", "filter": { "limit": 8 } },
      "visibleIf": { "auth": "required", "nonEmpty": true }
    },
    {
      "id": "home.deals.v1",
      "type": "deals_row",
      "title": { "en": "Top deals", "ar": "أفضل العروض" },
      "actionLabel": { "en": "See all", "ar": "عرض الكل" },
      "actionRoute": "/(tabs)/shops",
      "source": { "kind": "mock", "key": "DEMO_DEALS" }
    },
    {
      "id": "home.promo_strip.delivery.v1",
      "type": "promo_strip",
      "source": {
        "kind": "static",
        "payload": { "icon": "🚚", "headline": "Free delivery over 25,000 IQD", "subtext": "Limited time offer for Baghdad", "bg": "saffron" }
      }
    },
    {
      "id": "home.nearby.v1",
      "type": "nearby_shops_list",
      "title": { "en": "Shops near you", "ar": "متاجر قريبة منك" },
      "actionLabel": { "en": "See all", "ar": "عرض الكل" },
      "actionRoute": "/(tabs)/shops",
      "source": { "kind": "mock", "key": "DEMO_SHOPS" }
    }
  ]
}
```

Note: the three **new** Talabat-style slots are `home.order_again.v1`, `home.promoted_shops.may2026.v1`, and `home.popular_breakfast.v1` (plus `home.inspired_by_past.v1` as a fourth bonus). Everything else is a 1:1 lift of today's screen, now layout-driven.

---

## 4. Vendor → super-admin → mobile flow

**Vendor side.** Vendors only manage their own catalog: products, prices, photos, videos (Scrolls), shop logo, opening hours. They never touch home placement, never see "promoted slot" controls, never pick which sections appear on home. They can optionally request paid promotion via a billing flow, but the actual placement decision lives with super-admin.

**Super-admin side (future, not in this repo's vendor portal).** A separate super-admin surface authors the `HomeLayout` document: which slots are active, in what order, what title each carries (en/ar), which content source feeds them, which campaigns get to occupy `promoted_shops_slot` and during what date range. Super-admin also defines per-vertical filters (the sub-vertical chips for food: "Burgers, Breakfast, Shawarma…") and category groupings. Publishing increments `version` and broadcasts.

**Mobile side.** On app open, `useHomeLayout()` fetches `GET /store/home-layout` (cached, falls back to embedded mock). The home screen renders `layout.slots.map(slot => <ContentSection key={slot.id} slot={slot} ... />)`. `ContentSection` calls a resolver to materialize the source into props, then dispatches by `slot.type` to the right body component. Promoted items are rendered identically to organic ones with an overlaid `PromotedPill` — no separate code path.

---

## 5. Migration plan (existing home → layout-driven home)

The migration is mechanical and can be PR'd in three small steps without breaking the screen at any commit.

1. **Add layout types + mock layout, no UI changes.** Create `mobile/src/lib/home/layoutTypes.ts`, `mobile/src/lib/home/mockLayout.ts` (export `DEFAULT_HOME_LAYOUT` matching today's hard-coded order), and `mobile/src/lib/home/resolveSource.ts` (maps `source.key` to the existing `DEMO_*` arrays + derived sources). No screen change yet — just typed scaffolding.
2. **Add `ContentSection` + 4 new presentational components.** Each new component wraps or imports the existing body components: `ContentSection` is a `switch (slot.type)` over the existing pieces (`HeroBanner`, `CategoriesCarousel`, `FeaturedShopsCarousel`, `DealsCarousel`, `PromoStrip`, `ActiveBasketsCarousel`, `ShopRow`) plus the new `ShopLogoStrip` / `MixGrid` / `ProductCardRow`. Drop in `PromotedPill` overlay logic where `item.sponsored === true`. No screen change yet.
3. **Replace `index.tsx` body with one map.** The ScrollView body becomes:
   ```tsx
   {layout.slots.map(slot => (
     <ContentSection
       key={slot.id}
       slot={slot}
       onItemPress={handleItemPress}
       onAddToCart={handleAddToCart}
     />
   ))}
   ```
   The `SafeAreaView` + `TopBar` + `SearchBox` stay outside the loop — they're chrome, not content. The `searchWrapper` / `heroBannerWrapper` paddings move into `ContentSection` (it owns inter-section spacing). After this commit, reordering sections requires editing `DEFAULT_HOME_LAYOUT`, not JSX.

After step 3, swapping in a backend endpoint is a one-line change in `useHomeLayout()`.

---

## 6. Open questions for the user

The following ambiguities would unblock implementation. Answers in your next message will let SP-1.3 ship cleanly.

1. **Promoted-slot visual contract** — Should a `promoted_shops_slot` look **identical** to `featured_shops_row` (cover-card style) with only the small "Promoted" pill differentiating it, or should it also use the `ShopLogoStrip` (logos row) variant? Talabat does both depending on placement — pick one default for v1.

2. **"Inspired by your past orders" exact mix ratio** — In a `MixGrid` with N cells, should the ratio of shop tiles to product tiles be fixed (e.g. 1 shop : 2 products), or fully data-driven (whatever the recommender returns)? This affects whether we need a `mixRatio` field on the slot.

3. **Vertical sub-chip strip (Burgers / Breakfast / Shawarma)** — Does this strip live **on the home screen** at all in v1, or only on the food vertical's category landing page? If on home, it appears only after the user has filtered to a vertical, or always (as a parent-vertical entry point)?

4. **Sponsorship attribution UX** — When a promoted shop is tapped, do we need to record an ad click (impression/click tracking endpoint) in SP-1.3, or is that deferred to whenever real campaigns ship? Affects whether the `onPress` path in `ContentSection` needs a hook into a tracking client now.

5. **Authoring locale model** — `title` and `actionLabel` carry `{ en, ar }` inline. Is that acceptable for v1, or do we want translation keys (`title: 'home.order_again.title'`) resolved through `i18n` so super-admin doesn't have to enter both languages each time? Inline is faster for now; key-based scales better.
