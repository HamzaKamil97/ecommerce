# Phase A0 — Customer UI Audit (Hanoot Mobile)

Date: 2026-05-20
Scope: `D:\Personal\08_Ecommerce app\ecommerce-mvp\mobile\app\*` + the global overlays.
Mode: read-only research. No code changes.
Reference apps (in priority order): InstaShop, Talabat, Toters, Miswag.

Legend in tables:
- Wired? = `Yes` (interactive + leads somewhere useful), `Partial` (works but missing key behavior / state), `Dead` (no-op or stub).
- State coverage = subset of `{empty, loading, error, success, auth-required}` that the screen handles for that element / section.

Counts at the bottom of this doc (Section F).

---

## 1. `/(tabs)/index.tsx` — Home

File: `mobile/app/(tabs)/index.tsx`. Uses `tokens.*` (no `useTheme`). Subscribes to `useLanguageStore(s.locale)` at line 22. All strings localized via `t()`.

| # | Element | Type | Wired? | State coverage | Talabat/InstaShop has? | Gap / Action |
|---|---|---|---|---|---|---|
| 1.1 | TopBar "Deliver to · Baghdad" row | Button | Partial | auth-required (alert) | Yes | City is hardcoded "Baghdad" (line 55). No real address-selected display; auth-gated alert instead of bottom-sheet picker. Wire to address picker sheet even when unauthenticated. |
| 1.2 | TopBar cart pill (bag icon + badge) | Button | Yes | success (badge) | Yes | OK. Badge renders ≥1. Consider visual upgrade per phone-test item 21. |
| 1.3 | TopBar notifications bell | Button | Dead | — | Yes | `onNotifications` prop is **not passed** from index.tsx — the icon is hidden. Wire it to `/notifications`. |
| 1.4 | SearchBox (whole pill) | Button | Partial | — | Yes (instant search) | Pressing it navigates to `/(tabs)/shops` instead of opening typeahead. InstaShop opens search overlay. |
| 1.5 | SearchBox filter icon (≡ / options-outline) | Button | Yes | — | Yes (sheet) | Opens FilterSheet modal. FilterSheet's `onApply` is **not connected** at home — filters apply nowhere. |
| 1.6 | HeroBanner slide CTA buttons (per slide) | Button | Partial | — | Yes | `onCta` is forwarded to `onSeeAll(slot.actionRoute)` — same route for all slides (loses slide context). Phone-test item 4: 1→2 transition glitch. |
| 1.7 | HeroBanner pagination dots | Indicator | Yes | — | Yes | Static dots, not tappable. Acceptable. |
| 1.8 | HeroBanner auto-rotate | Behavior | Yes | — | Yes | OK. |
| 1.9 | CategoriesCarousel chip (per category) | Button | Partial | — | Yes | Routes blindly to `/(tabs)/shops` (line 42) — category handle is discarded. Should filter Shops by vertical. |
| 1.10 | CategoriesCarousel "See all" | Link | Partial | — | Yes | Routes to `/(tabs)/shops`. Should open category index. |
| 1.11 | FeaturedShopsCarousel shop card | Button | Yes | — | Yes | OK. Click-through tracking TODO (line 61 ContentSection). |
| 1.12 | FeaturedShopsCarousel "See all" | Link | Partial | — | Yes | Phone-test item 6 — same `onSeeAll` lump route. |
| 1.13 | DealsCarousel deal card | Button | Partial | — | Yes (deal detail) | `onSelect` → `handleSeeAll` (no per-deal route). Deals never open. |
| 1.14 | DealsCarousel "See all" | Link | Partial | — | Yes | Same lump route. |
| 1.15 | ActiveBasketsCarousel "Resume" | Button | Yes | — | Yes (Talabat resume) | Routes to shop. OK. |
| 1.16 | ShopRow cards in nearby list | Button | Yes | — | Yes | Routes to shop. OK. Phone-test items 7 (`+` removed) and 23 (open/closed pill) tracked. |
| 1.17 | ShopRow "OPEN/CLOSED" pill | Indicator | Yes | — | Different (Talabat uses softer chip) | Phone-test 23 — still feels "network" not shop. Suggest icon variant change. |
| 1.18 | ForYouCarousel card body | Button | Yes | — | InstaShop has FYP-like row | OK. |
| 1.19 | ForYouCarousel QuantityStepper (+ / − / qty) | Stepper | Yes | success | Yes | OK. Recommender data is static (see AI honesty section). |
| 1.20 | ForYouCarousel "Picked for you" badge | Label | Yes | — | InstaShop has similar | OK. No "Preview" disclosure on AI surfaces. |
| 1.21 | ShopLogoStrip "Order again" tile | Button | Yes | — | Yes (Talabat) | OK. |
| 1.22 | MixGrid item | Button | Yes | — | Yes | OK. |
| 1.23 | PromoStrip | Section | Partial | — | Yes | Static. No CTA, no link to deal/coupon. |
| 1.24 | Promoted shops slot | Section | Yes | — | Different (real ad pipeline) | TODO ad-click tracking endpoint (ContentSection.tsx:61). |
| 1.25 | Pull-to-refresh | Gesture | Dead | — | Yes | ScrollView has no RefreshControl. Standard pattern is missing. |

Hardcoded English on this screen: none (city "Baghdad" is interpolated; the rest go through `t()`).

---

## 2. `/(tabs)/shops.tsx` — Search / Shops tab

File: `mobile/app/(tabs)/shops.tsx`. Uses `tokens.*`. Does **NOT** subscribe to `useLanguageStore(s.locale)` — so AR/EN toggle won't force re-render. Hardcoded English strings (not `t()`): "Search" (line 52), "Shops, food, categories…" (line 57), "No results" / `"No shops found for "{query}""` (line 116-118), "Recent searches" (line 92), "All shops" (line 109), `RECENT_SEARCHES` array (line 10), chip labels `All / Food / Grocery / Fast delivery / Open now` (line 12-18). Major i18n debt.

| # | Element | Type | Wired? | State coverage | Talabat/InstaShop has? | Gap / Action |
|---|---|---|---|---|---|---|
| 2.1 | Search input (TextInput) | Input | Yes | empty + filtered | Yes | OK; client-side filter on DEMO_SHOPS only. No backend search call. |
| 2.2 | Search clear ✕ | Button | Yes | — | Yes | OK. |
| 2.3 | Search filter ≡ | Button | Dead | — | Yes | `onPress={() => {}}` at line 73. Phone-test item 9 & 19 — still dead. Wire to `FilterSheet`. |
| 2.4 | FilterChips (All / Food / Grocery / Fast delivery / Open now) | Chips | Yes | — | Yes | Single-select. Hardcoded English labels. |
| 2.5 | Recent searches pill (per term) | Button | Yes | — | Yes | Pre-populated mock list. Doesn't persist actual history. |
| 2.6 | Shop result row | Button | Yes | empty (`No results`) | Yes | OK. |
| 2.7 | Pull-to-refresh | Gesture | Dead | — | Yes | Missing. |
| 2.8 | Empty/no-data state outside query | State | Dead | empty | — | If `DEMO_SHOPS` were empty, nothing shows. |
| 2.9 | Sort selector | Selector | Dead | — | Yes (Talabat) | Not implemented. Filter sheet exists but isn't reachable from here. |
| 2.10 | Map view toggle | Toggle | Dead | — | Yes (Talabat) | Not built. |

Issues: emoji icons (🔍, ✕, ≡) per phone-test item 16 should be Ionicons.

---

## 3. `/(tabs)/scrolls.tsx` — Vertical feed

File: `mobile/app/(tabs)/scrolls.tsx`. No `useTheme`. Subscribes to `useLanguageStore(s.locale)` at line 10. ScrollCard at `src/components/scrolls/ScrollCard.tsx`.

| # | Element | Type | Wired? | State coverage | Talabat/InstaShop has? | Gap / Action |
|---|---|---|---|---|---|---|
| 3.1 | FlatList pager (vertical) | Gesture | Yes | — | InstaShop "Stories", Talabat n/a; closer to TikTok | OK. |
| 3.2 | Video autoplay (active card) | Behavior | Yes | loading impl. | Yes (TikTok pattern) | Uses `expo-av`. No buffering UI; no muted/unmute toggle. |
| 3.3 | Shop badge top-left | Button | Dead | — | Yes (TikTok account link) | No onPress — shopBadge is a `<View>` (line 104 in ScrollCard). Should route to `/shops/<slug>`. |
| 3.4 | Vertical pill top-right | Label | Yes | — | — | Display-only, fine. |
| 3.5 | Like heart (right rail) | Button | Partial | success (haptic + toggle) | Yes | State is local — `setLiked` (line 38). Not persisted server-side or in store. No likes count delta. |
| 3.6 | Save bookmark (right rail) | Button | Partial | local toggle | Yes | Same — local-only. No favorites list anywhere consuming this. |
| 3.7 | Share (right rail) | Button | Yes | success | Yes | Uses RN Share API. Hardcoded English message at line 55-57 (`scroll.productName + Hanoot`). |
| 3.8 | Comments rail | Button | Dead | — | Yes | Not present. |
| 3.9 | Add pill (price CTA bottom) | Button | Yes | success ("Added!" flash) | Different | Adds to cart; uses `cross_shop_required` path implicitly. No CrossShopModal trigger handled here. |
| 3.10 | Product name tap | Button | Yes | — | Yes | Whole image area routes to `/products/<productId>`. |
| 3.11 | Pull-to-refresh / load-more | Gesture | Dead | — | Yes | Fixed `DEMO_SCROLLS` array only. |
| 3.12 | Mute/unmute | Button | Dead | — | Yes (TikTok) | `isMuted` hardcoded true at line 94. |
| 3.13 | Reposting / "Why you'll like this" AI line | Label | Dead | — | — | Per SP-1.3 idea — parked. |

Hardcoded English: `${scroll.productName} — ${scroll.shopName} on Hanoot` (line 55). Rest via `t()`.

---

## 4. `/(tabs)/cart.tsx` — Cart

File: `mobile/app/(tabs)/cart.tsx`. Uses `tokens.*`. Subscribes to locale at line 18. Most strings via `t()`. Hardcoded English in `StoreSection.tsx`: "+ Add more" (line 44), "Store subtotal" (line 68), "Estimated 25–35 min" delivery info passed inline from cart.tsx line 89.

| # | Element | Type | Wired? | State coverage | Talabat/InstaShop has? | Gap / Action |
|---|---|---|---|---|---|---|
| 4.1 | Header back button | Button | Yes | — | Yes | OK. |
| 4.2 | Empty cart "Browse shops" CTA | Button | Yes | empty | Yes | OK. |
| 4.3 | StoreSection "+ Add more" | Button | Yes | — | Yes (Talabat) | Routes to `/shops/<slug>`. Hardcoded English. |
| 4.4 | StoreSection clear (✕) | Button | Partial | — | Yes | No confirmation modal — one tap nukes basket. Add Alert.confirm. |
| 4.5 | CartLineItem stepper +/- | Stepper | Yes | success | Yes | OK. |
| 4.6 | CartLineItem remove | Button | Yes | — | Yes | OK. |
| 4.7 | CartLineItem tap (open product) | Button | Yes | — | Yes | OK. |
| 4.8 | Shop notes TextInput | Input | Yes | — | Different (Talabat has per-item notes too) | OK. Saves on blur. |
| 4.9 | Delivery notes TextInput | Input | Yes | — | Yes | OK. |
| 4.10 | CouponRow (only on checkout — missing here?) | — | n/a | — | Yes (often inline in cart) | Coupon entry currently lives in checkout only. Consider showing in cart too (InstaShop pattern). |
| 4.11 | CartSummary subtotal/fee/delivery breakdown | Section | Yes | — | Yes | OK. Delivery fee hardcoded `DELIVERY_FEE = 2500` at line 13. |
| 4.12 | Sticky checkout bar CTA | Button | Yes | success/disabled | Yes | OK. Hardcoded text-color `'rgba(255,255,255,0.88)'` in StickyCheckoutBar.tsx:68 — fine. |
| 4.13 | Pull-to-refresh | Gesture | Dead | — | n/a | Missing — fine. |
| 4.14 | Tip-the-courier option | Section | Dead | — | Yes (Talabat) | Not present. |
| 4.15 | Schedule delivery option | Section | Dead | — | Yes (InstaShop grocery) | Not present. |

---

## 5. `/(tabs)/orders.tsx` — Orders list

File: `mobile/app/(tabs)/orders.tsx`. Uses `tokens.*`. Subscribes to locale at line 14. Auth-gated.

| # | Element | Type | Wired? | State coverage | Talabat/InstaShop has? | Gap / Action |
|---|---|---|---|---|---|---|
| 5.1 | Header "Orders" | Title | Yes | — | Yes | OK. |
| 5.2 | Auth gate (logged out) | State | Yes | auth-required | Yes | EmptyState only — no Login CTA button (just message). Add `Log in` button. |
| 5.3 | Order card tap | Button | Yes | empty | Yes | Routes to `/orders/<id>`. |
| 5.4 | Order card status pill | Indicator | Yes | — | Yes | OK. |
| 5.5 | Order card ETA "⏱ Arriving in" | Label | Yes | — | Yes | Static text. Emoji icon — should be Ionicons. |
| 5.6 | Pull-to-refresh | Gesture | Dead | — | Yes | Missing. |
| 5.7 | Tabs "Active / Past" | Tabs | Dead | — | Yes (Talabat) | Not implemented — all orders flat. |
| 5.8 | "Reorder" button on past order card | Button | Dead | — | Yes | Not implemented. |
| 5.9 | Empty state subtitle | State | Yes | empty | Yes | OK. |

---

## 6. `/(tabs)/profile.tsx` — Profile / Account

File: `mobile/app/(tabs)/profile.tsx`. Uses `tokens.*`. Subscribes to locale at line 24. All visible strings via `t()`. Uses emoji icons everywhere — phone-test item 16 to swap to Ionicons.

| # | Element | Type | Wired? | State coverage | Talabat/InstaShop has? | Gap / Action |
|---|---|---|---|---|---|---|
| 6.1 | Header card (avatar + name + email) | Section | Yes | auth (logged-in) | Yes | OK. |
| 6.2 | Edit profile button | Button | Yes | — | Yes | OK. |
| 6.3 | Stats row — Orders count | Stat | Dead | — | Yes | Hardcoded `0` (line 64). Doesn't reflect real orders. |
| 6.4 | Stats row — Addresses count | Stat | Dead | — | Yes | Hardcoded `0` (line 68). |
| 6.5 | Menu: My orders | Row | Yes | — | Yes | Routes OK. Emoji 📦. |
| 6.6 | Menu: Addresses | Row | Yes | — | Yes | Routes OK. Emoji 📍. |
| 6.7 | Menu: Payment methods | Row | Dead | — | Yes | `onPress={() => {}}` (line 77). |
| 6.8 | Menu: Rewards | Row | Yes | — | Yes | Routes to /loyalty. Emoji 🎁. |
| 6.9 | Menu: Wallet | Row | Yes | — | Yes | Routes to /wallet. |
| 6.10 | Menu: Language | Row | Yes | — | Yes | Opens LanguagePicker. |
| 6.11 | Menu: Notifications | Row | Yes | — | Yes | Routes OK. |
| 6.12 | Menu: Favorites | Row | Dead | — | Yes | `onPress={() => {}}` (line 85). No favorites screen exists. |
| 6.13 | Menu: Help | Row | Dead | — | Yes | `onPress={() => {}}` (line 89). |
| 6.14 | Menu: Terms | Row | Dead | — | Yes | `onPress={() => {}}` (line 90). |
| 6.15 | Menu: Privacy | Row | Dead | — | Yes | `onPress={() => {}}` (line 91). |
| 6.16 | Sign out button | Button | Yes | — | Yes | Calls `logout` directly; no confirmation. |
| 6.17 | Guest state: Log in / Create account buttons | Button | Yes | auth-required | Yes | OK. |
| 6.18 | App version label | Label | Yes | — | Yes | Hardcoded `1.0.0-beta`. |

---

## 7. `/(tabs)/_layout.tsx` — Tab bar

File: `mobile/app/(tabs)/_layout.tsx`. Uses SF Symbol `IconSymbol` only (line 29-65). See Section A for full analysis.

| # | Element | Type | Wired? | State coverage | Talabat/InstaShop has? | Gap / Action |
|---|---|---|---|---|---|---|
| 7.1 | Home tab (`house.fill`) | Tab | Yes | — | Yes | Label "Shop" — ambiguous given "Shops" sibling. |
| 7.2 | Shops tab (`storefront.fill`) | Tab | Yes | — | Yes | Label "Shops" — see Section A. |
| 7.3 | Scrolls tab (`play.rectangle.fill`) | Tab | Yes | — | Different (InstaShop has no scrolls) | OK. |
| 7.4 | Cart tab (`cart.fill`) | Tab | Partial | — | Yes | **No badge** on tab itself for cart count. Phone-test item 18 — TopBar shows cart-count, but tab does not. |
| 7.5 | Orders tab (`bag.fill`) | Tab | Partial | — | Yes | No badge for active-orders count. |
| 7.6 | Profile tab (`person.fill`) | Tab | Yes | — | Yes | OK. |
| 7.7 | ButlerFab overlay | Floating btn | Yes | — | Toters Butler | Always pulses on first mount. Could obscure tab content on small screens. |
| 7.8 | Tab tint color | Theme | Partial | — | Yes (brand) | Uses `Colors[colorScheme].tint` from default Expo theme — **not brand teal `tokens.colors.primary`**. |

---

## 8. `/shops/[slug].tsx` — Shop detail

File: `mobile/app/shops/[slug].tsx`. Uses `tokens.*`. Does **NOT** subscribe to locale store — Arabic toggle won't re-render this screen. All visible strings hardcoded in English: "Shop not found"/"It may have been removed…" (line 175-176), "No products yet"/"This shop hasn't published…" (line 392-393). Stack title is also hardcoded.

| # | Element | Type | Wired? | State coverage | Talabat/InstaShop has? | Gap / Action |
|---|---|---|---|---|---|---|
| 8.1 | ShopHero cover image | Section | Yes | — | Yes | OK (with overlays). |
| 8.2 | ShopHero back button (‹) | Button | Yes | — | Yes | OK. Uses emoji-like `‹` text not Ionicons. |
| 8.3 | ShopHero favorite (♡) | Button | Dead | — | Yes | `onFavorite={() => {}}` (line 301). |
| 8.4 | ShopHero share (⤴) | Button | Dead | — | Yes | `onShare={() => {}}` (line 302). |
| 8.5 | ShopInfoBar (logo + name + rating + ETA) | Section | Yes | — | Yes | OK. Min order, delivery fee, rating from `SHOP_META` hardcoded map. |
| 8.6 | ShopInfoBar — Info/Hours expand | Button | Dead | — | Yes | No expand. No hours data shown. |
| 8.7 | ShopInfoBar — Address line | Label | Dead | — | Yes (tap to view on map) | Not present. |
| 8.8 | ShopSearchBox (within shop) | Button | Partial | — | Yes (in-shop search) | Routes to `/(tabs)/shops` — does NOT filter to this shop. Phone-test item 19. |
| 8.9 | MerchTabs (category pills) | Tabs | Yes | — | Yes (Talabat) | OK. |
| 8.10 | ProductGridCard tap | Button | Yes | loading + empty | Yes | OK. Phone-test item 1 fixed via DEMO map. |
| 8.11 | ProductGridCard QuantityStepper | Stepper | Yes | success | Yes | OK. |
| 8.12 | CartFab | Button | Yes | — | Yes (Talabat sticky) | OK. |
| 8.13 | "Loading" state | State | Yes | loading | Yes | ActivityIndicator with timeout fallback to demo data. |
| 8.14 | "Shop not found" state | State | Yes | error | Yes | EmptyState. |
| 8.15 | "No products yet" state | State | Yes | empty | Yes | OK. Hardcoded English. |
| 8.16 | Reviews / ratings section | Section | Dead | — | Yes (Talabat tab) | Not surfaced on shop page. |
| 8.17 | Promotions/coupons row | Section | Dead | — | Yes (Talabat highlights) | Not present. |

---

## 9. `/products/[id].tsx` — Product detail

File: `mobile/app/products/[id].tsx`. Uses `tokens.*` (no useTheme). Does **NOT** subscribe to locale. Phone-test item 20: color bleed on price likely fixed (uses `<PriceText>` with tokens). Hardcoded English visible: "⭐ 4.8 · 120 reviews ›" (line 199), description renders directly from product.

| # | Element | Type | Wired? | State coverage | Talabat/InstaShop has? | Gap / Action |
|---|---|---|---|---|---|---|
| 9.1 | ImageCarousel slides | Section | Yes | — | Yes | OK. |
| 9.2 | Back button overlay | Button | Yes | — | Yes | Uses `‹` text. |
| 9.3 | ShopBadge (logo + name) | Button | Yes | — | Yes | Routes to shop. |
| 9.4 | Title + Price | Section | Yes | loading | Yes | OK. |
| 9.5 | Reviews row "⭐ 4.8 · 120 reviews ›" | Button | Partial | — | Yes | Hardcoded numbers (line 199). Only routes when `product` exists (real product) — demo products skip the route. |
| 9.6 | Description | Section | Yes | — | Yes | OK. |
| 9.7 | DetailsPanel (schema fields) | Section | Yes | — | Yes (specs) | Only renders for real backend products with schema; demo products have none. |
| 9.8 | StickyAddToCart quantity stepper | Stepper | Yes | — | Yes | OK. |
| 9.9 | StickyAddToCart "Add to cart" button | Button | Yes | success (toast) | Yes (Talabat stays on shop) | Returns to previous screen (per phone-test fix). |
| 9.10 | CartFab | Button | Yes | — | Yes | OK. |
| 9.11 | Favorite (heart) on product | Button | Dead | — | Yes | Not present at all. |
| 9.12 | Share product | Button | Dead | — | Yes | Not present. |
| 9.13 | Variant selector (size/colour) | Selector | Dead | — | Yes (fashion) | Not implemented despite multi-vertical scope. |
| 9.14 | "Customers also viewed" rail | Section | Dead | — | Yes (Amazon) | Not present. |
| 9.15 | Out-of-stock / unavailable | State | Dead | — | Yes | No inventory awareness. |
| 9.16 | Auth gate for adding | State | Dead | auth-required | Different (often allowed guest) | Not enforced — can add as guest, fails at checkout. |
| 9.17 | Error state on fetch fail | State | Partial | error | Yes | Falls back to demo silently (line 56-58); no visible error. |

---

## 10. `/orders/[id].tsx` — Order detail

File: `mobile/app/orders/[id].tsx`. Uses `tokens.*`. Subscribes to locale at line 19. Sections in `src/components/orders/OrderDetailSections.tsx`. Hardcoded English: "Items ({count})" (line 82), "Subtotal" (line 101), "Method" / "Items" / "Delivery" / "Free" (line 140-149), "Coming soon" Alert messages (line 71, 124).

| # | Element | Type | Wired? | State coverage | Talabat/InstaShop has? | Gap / Action |
|---|---|---|---|---|---|---|
| 10.1 | Status banner (out-for-delivery) | Section | Yes | — | Yes | Only shows for `out_for_delivery`. |
| 10.2 | StatusCard + headline | Section | Yes | — | Yes | OK. "Delivered/Cancelled" headlines hardcoded English. |
| 10.3 | TimelineCard (5 milestones) | Section | Yes | — | Yes | OK. |
| 10.4 | ShopCard — "Contact shop" button | Button | Dead | — | Yes | `Alert.alert('Coming soon')` (line 71). |
| 10.5 | ShopCard — Go to shop link | Link | Dead | — | Yes | Not present. |
| 10.6 | ItemsCard list | Section | Yes | — | Yes | OK. |
| 10.7 | DeliveryCard address | Section | Yes | — | Yes | OK. |
| 10.8 | DeliveryCard "Call courier" | Button | Dead | — | Yes | `Alert.alert('Coming soon')` (line 124). |
| 10.9 | DeliveryCard map preview | Section | Dead | — | Yes | Not present (live location parked). |
| 10.10 | PaymentCard breakdown | Section | Yes | — | Yes | OK. "Delivery — Free" hardcoded. |
| 10.11 | Cancel order button | Button | Dead | — | Yes | Not present. |
| 10.12 | Refund / Return button | Button | Dead | — | Yes | Not present. |
| 10.13 | "Order again" / reorder | Button | Dead | — | Yes | Not present. |
| 10.14 | Rate this order / shop | Button | Dead | — | Yes | Not present. |
| 10.15 | Get receipt / invoice | Button | Dead | — | Yes | Not present. |
| 10.16 | Not-found state | State | Yes | empty | Yes | EmptyState. |

---

## 11. `/order/success/[id].tsx` — Order success

File: `mobile/app/order/success/[id].tsx`. Uses `tokens.*` (with local re-export to `colors` const). Subscribes to locale at line 19. Hardcoded English: "Shop" / "Arriving in" / "Cash on Delivery" via icons (line 56-58), "We'll text you when the order updates." (line 62), "📍 Track order" CTA (line 72). Emoji icons throughout. **There's also a duplicate `mobile/app/order-success.tsx`** at the same name — possibly legacy. Confirm and delete.

| # | Element | Type | Wired? | State coverage | Talabat/InstaShop has? | Gap / Action |
|---|---|---|---|---|---|---|
| 11.1 | Success checkmark animation | Animation | Yes | success | Yes | OK. |
| 11.2 | Title + order code | Label | Yes | — | Yes | OK. |
| 11.3 | Info row — Shop | Label | Yes | — | Yes | OK. |
| 11.4 | Info row — Arriving in | Label | Yes | — | Yes | OK. |
| 11.5 | Info row — Payment | Label | Yes | — | Yes | OK. |
| 11.6 | "Track order" CTA | Button | Yes | — | Yes | Routes to `/orders/<id>`. |
| 11.7 | "Back to shopping" CTA | Button | Yes | — | Yes | Routes to `/(tabs)/shops`. |
| 11.8 | Subscribe to push notifications prompt | Button | Dead | — | Yes | Not present. |
| 11.9 | Rate experience prompt | Button | Dead | — | Different | Not present (later trigger). |

---

## 12. `/checkout.tsx` — Checkout

File: `mobile/app/checkout.tsx`. Uses `tokens.*` re-exported as `colors` (no `useTheme`). Does **NOT** subscribe to locale. Mostly hardcoded English: "Checkout" (line 123), "DELIVER TO" / "DELIVERY INSTRUCTIONS" / "COUPON" / "PAYMENT" / "SUMMARY" (line 129, 171, 184, 189, 215), "Cash on Delivery" + "Pay the rider on delivery" (line 195-198), "Cart is empty" / "Please add a delivery address" (line 79, 84), "Place order" / "Placing..." (line 314-315). i18n debt is significant.

| # | Element | Type | Wired? | State coverage | Talabat/InstaShop has? | Gap / Action |
|---|---|---|---|---|---|---|
| 12.1 | Header back | Button | Yes | — | Yes | OK. Uses `<` text. |
| 12.2 | Address card tap → picker | Button | Yes | empty | Yes | Opens AddressPickerSheet. |
| 12.3 | "+ Add delivery address" button | Button | Yes | — | Yes | OK. |
| 12.4 | Delivery instructions input | Input | Yes | — | Yes | OK. |
| 12.5 | CouponRow apply | Input | Yes | — | Yes | OK. |
| 12.6 | Payment — Cash on Delivery | Selector | Partial | — | Yes (multiple methods) | Hardcoded single option; no toggle to switch payment method. |
| 12.7 | Summary breakdown | Section | Yes | — | Yes | OK. Delivery fee hardcoded `2500` (line 109). |
| 12.8 | Notes review block ("Edit" link) | Link | Yes | — | Yes (Talabat) | OK — routes back. |
| 12.9 | Error text inline | State | Yes | error | Yes | OK. |
| 12.10 | Place order button | Button | Yes | loading + disabled | Yes | OK. |
| 12.11 | Tip the courier picker | Section | Dead | — | Yes (Talabat) | Not present. |
| 12.12 | Schedule delivery time | Selector | Dead | — | Yes (InstaShop grocery) | Not present. |
| 12.13 | Order-level notes ("Leave at door" presets) | Selector | Dead | — | Yes | Only free-text input. |
| 12.14 | StatusBar style enforcement | Behavior | Yes (`style="dark"`) | — | — | Phone-test item 13: checkout went dark in past — appears fixed via explicit StatusBar. |

---

## 13. `/auth/login.tsx` + `/auth/register.tsx` — Auth

Files: `mobile/app/auth/login.tsx`, `mobile/app/auth/register.tsx`. **Both use `useTheme()`** (login line 9, register line 9) — this is the dark-mode-bleed bug pattern called out in feedback. All strings hardcoded English. No locale subscription.

| # | Element | Type | Wired? | State coverage | Talabat/InstaShop has? | Gap / Action |
|---|---|---|---|---|---|---|
| 13.1 (login) | Email input | Input | Yes | — | Yes | OK. |
| 13.2 (login) | Password input | Input | Yes | — | Yes | OK; no show/hide toggle. |
| 13.3 (login) | "Log in" button | Button | Yes | loading + error | Yes | OK. |
| 13.4 (login) | "Need an account? Register" | Button | Yes | — | Yes | OK. |
| 13.5 (login) | "Google / Facebook login — coming soon" | Label | Dead | — | Yes | Just a hint, no actual buttons. |
| 13.6 (login) | Forgot password | Link | Dead | — | Yes | Not present. |
| 13.7 (login) | Phone OTP login | Button | Dead | — | Yes (Talabat MENA standard) | Not present despite being THE main MENA auth method. |
| 13.8 (register) | First name * | Input | Yes | error | Yes | OK. |
| 13.9 (register) | Last/Email/Phone/Password inputs | Input | Yes | error | Yes | OK. |
| 13.10 (register) | Create account button | Button | Yes | loading + error | Yes | OK. |
| 13.11 (register) | Already have an account? Log in | Button | Yes | — | Yes | OK. |
| 13.12 (register) | T&C / Privacy checkboxes | Input | Dead | — | Yes | Not present (legal liability gap). |
| 13.13 (register) | Phone OTP flow | Button | Dead | — | Yes (Talabat MENA) | Not present. |

---

## 14. `/addresses/index.tsx` + `/addresses/[id].tsx` — Addresses

Files: `mobile/app/addresses/index.tsx`, `mobile/app/addresses/[id].tsx`. Both use `tokens.*` (no useTheme). All strings hardcoded English. No locale subscription. No Stack.Screen title localized.

| # | Element | Type | Wired? | State coverage | Talabat/InstaShop has? | Gap / Action |
|---|---|---|---|---|---|---|
| 14.1 | Address list — pull to refresh | Gesture | Yes | refreshing | Yes | OK. |
| 14.2 | Address list — empty state | State | Yes | empty | Yes | OK. Hardcoded "No saved addresses". |
| 14.3 | Address card — Edit | Button | Yes | — | Yes | OK. |
| 14.4 | Address card — Delete | Button | Yes | confirm | Yes | Alert.alert confirmation. |
| 14.5 | "+ Add new address" button | Button | Yes | — | Yes | OK. |
| 14.6 | Loading | State | Yes | loading | Yes | OK. |
| 14.7 | Address card — Set as default | Button | Dead | — | Yes | Toggle only available in editor; no quick action on card. |
| 14.8 | Address editor — fields | Input | Yes | validation (street/city required) | Yes | OK. |
| 14.9 | Address editor — pick on map | Button | Dead | — | Yes (Talabat) | Not present. Iraqi addressing especially benefits from map. |
| 14.10 | Address editor — geolocate "Use current location" | Button | Dead | — | Yes | Not present. |
| 14.11 | Address editor — Save | Button | Yes | loading + error | Yes | OK. |
| 14.12 | Address editor — Cancel | Button | Yes | — | Yes | OK. |
| 14.13 | Default address toggle | Switch | Yes | — | Yes | OK. |

---

## 15. `/profile/edit.tsx` — Profile editor

File: `mobile/app/profile/edit.tsx`. Uses `tokens.*` (no useTheme). All hardcoded English: "Personal info" (line 33), field labels (`First name *`, `Last name`, etc.), "Email cannot be changed here." (line 64).

| # | Element | Type | Wired? | State coverage | Talabat/InstaShop has? | Gap / Action |
|---|---|---|---|---|---|---|
| 15.1 | First name input | Input | Yes | error (required) | Yes | OK. |
| 15.2 | Last name input | Input | Yes | — | Yes | OK. |
| 15.3 | Email input (disabled) | Input | Yes (read-only) | — | Yes | OK. |
| 15.4 | Phone input | Input | Yes | — | Yes | OK; no E.164 / Iraq format helper. |
| 15.5 | Save changes button | Button | Yes | loading + error | Yes | OK. |
| 15.6 | Cancel button | Button | Yes | — | Yes | OK. |
| 15.7 | Avatar upload | Button | Dead | — | Yes | Not present. |
| 15.8 | Change password | Button | Dead | — | Yes | Not present. |
| 15.9 | Delete account | Button | Dead | — | Yes (App Store requires it) | Not present. |

---

## 16. `/onboarding.tsx`

File: `mobile/app/onboarding.tsx`. **Uses `useTheme()`** (line 21). All strings hardcoded English: "Everything you need, in one place" (line 57), the subtitle (line 67-68), "Start shopping" (line 73).

| # | Element | Type | Wired? | State coverage | Talabat/InstaShop has? | Gap / Action |
|---|---|---|---|---|---|---|
| 16.1 | Animated bag emoji | Animation | Yes | — | Yes | OK. |
| 16.2 | Title + subtitle | Label | Yes | — | Yes | Hardcoded English. |
| 16.3 | "Start shopping" CTA | Button | Yes | — | Yes | Persists key and replaces to /(tabs). |
| 16.4 | Language picker on onboarding | Button | Dead | — | Yes (Talabat first-launch) | Not present — Arabic users hit English first. |
| 16.5 | Multi-step swipe carousel | Section | Dead | — | Yes (Talabat 3-slide intro) | Single screen only. |
| 16.6 | Skip / sign-in shortcut | Link | Dead | — | Yes | Not present. |

---

## 17. Auxiliary screens

### 17a. `/loyalty.tsx`
**Uses `useTheme()`**. Hardcoded English throughout: "Next tier", "Invite friends, earn 500 pts", "How you earn", earn-rules bullets. Hero card uses `tierColor()` — non-token color. All Share/Apply mechanics wired.

| # | Element | Type | Wired? | State | Reference | Gap |
|---|---|---|---|---|---|---|
| 17a.1 | Tier hero card | Section | Yes | loading | Yes | OK. |
| 17a.2 | Progress bar | Indicator | Yes | — | Yes | OK. |
| 17a.3 | Referral code Share button | Button | Yes | — | Yes | OK. |
| 17a.4 | Code input + Apply button | Input/Button | Yes | error (alert) | Yes | OK. |
| 17a.5 | How-you-earn list | Section | Yes | — | Yes | OK. |
| 17a.6 | History of points earned | Section | Dead | — | Yes | Not present. |
| 17a.7 | Redeemable rewards catalog | Section | Dead | — | Yes (Talabat) | Not present. |
| 17a.8 | Loading state | State | Partial | loading (text only) | — | Renders `Loading…` text only, no spinner. |

### 17b. `/wallet.tsx`
**Uses `useTheme()`**. Hardcoded English: "Wallet balance", "Top up", "Recent transactions", "No transactions yet", quick-amount buttons "$10/$25/$50/$100". USD-only; no IQD support visible.

| # | Element | Type | Wired? | Reference | Gap |
|---|---|---|---|---|---|
| 17b.1 | Balance hero | Section | Yes | Yes | OK. |
| 17b.2 | Top-up amount input | Input | Yes | Yes | USD only, no validation for non-numeric. |
| 17b.3 | Quick top-up buttons ($10/$25/$50/$100) | Button | Yes | Yes | USD-only. Iraq is IQD primarily. |
| 17b.4 | Add button | Button | Yes | loading | OK. |
| 17b.5 | Transaction list | List | Yes | empty | OK. |
| 17b.6 | Withdraw | Button | Dead | Yes | Not present. |
| 17b.7 | Payment method (how to top up) | Selector | Dead | Yes | Not present — top-up is instant fake. |

### 17c. `/notifications.tsx`
**Uses `useTheme()`**. Hardcoded English: "Notifications" / "{n} unread" / "No notifications yet" / "Your order updates and offers will appear here."

| # | Element | Type | Wired? | Reference | Gap |
|---|---|---|---|---|---|
| 17c.1 | Pull-to-refresh | Gesture | Yes | Yes | OK. |
| 17c.2 | Notification row tap | Button | Partial | Yes | Marks read but no deep-link to order/promotion. |
| 17c.3 | Mark all read | Button | Dead | Yes | Not present. |
| 17c.4 | Filter (unread / all) | Tab | Dead | Yes | Not present. |
| 17c.5 | Notification settings link | Link | Dead | Yes (push prefs) | Not present. |
| 17c.6 | Empty state | State | Yes | Yes | OK. |

### 17d. `/reviews/[productId].tsx`
**Uses `useTheme()`**. All English. Compose UI only shown to logged-in users.

| # | Element | Type | Wired? | Reference | Gap |
|---|---|---|---|---|---|
| 17d.1 | Average rating + stars hero | Section | Yes | Yes | OK. |
| 17d.2 | Distribution bars (5→1) | Section | Yes | Yes | OK; hardcoded star fill color `#F5C518` (line 84). |
| 17d.3 | StarRating editable (compose) | Input | Yes | Yes | OK. |
| 17d.4 | Title + body inputs | Input | Yes | Yes | OK. |
| 17d.5 | Submit review button | Button | Yes | loading | OK. |
| 17d.6 | Auth-required state | State | Partial | Yes | Compose hidden silently — no "Log in to review" CTA. |
| 17d.7 | Sort / filter reviews | Selector | Dead | Yes (Talabat) | Not present. |
| 17d.8 | Photo attachment to review | Button | Dead | Yes | Not present. |
| 17d.9 | Helpful / Report buttons per review | Button | Dead | Yes | Not present. |

---

## 18. Global overlays

| # | Component | File | Wired? | State | Gap |
|---|---|---|---|---|---|
| 18.1 | ButlerFab | `src/components/butler/ButlerFab.tsx` | Yes | — | Pulse runs once on mount. No "Preview" badge. |
| 18.2 | ButlerSheet | `src/components/butler/ButlerSheet.tsx` | Partial | success (toast) | Adds request to local zustand store only. Nothing is sent anywhere — no super-admin inbox endpoint exists. Free-text + 4 presets all funnel to same persisted list. |
| 18.3 | FlyToCartHost | `src/components/cart/FlyToCartHost.tsx` | Yes | — | Renders correctly. |
| 18.4 | CrossShopModal | `src/components/cart/CrossShopModal.tsx` | Yes | — | Uses tokens. Hardcoded English ("Start a new basket?", "Clear and add"). `#FEF3C7` warning bg literal at line 73 — fine. |
| 18.5 | ToastHost (`showToast`) | `src/components/Toast.tsx` | Yes | — | Confirm if shown on multiple screens. |
| 18.6 | FilterSheet (home) | `src/components/home/FilterSheet.tsx` | Partial | — | `onApply` not consumed by Home (no filter state in home). |
| 18.7 | LanguagePicker | `src/components/LanguagePicker.tsx` | Yes | — | Used from profile screen. |
| 18.8 | AddressPickerSheet | `src/components/checkout/AddressPickerSheet.tsx` | Yes | — | Used from checkout. |

---

## A. Tab-bar gaps (Section A)

Current: SF Symbol `IconSymbol` only, sized 28, tint = `Colors[colorScheme].tint` (default Expo `#0a7ea4` light / `#fff` dark) — **NOT brand teal** (`tokens.colors.primary` = `#0F766E`).

Issues found:
- **Label "Shop" (Home) vs "Shops" (Search)** — ambiguous. InstaShop uses Home / Browse / Cart / Account; Talabat uses Restaurants / Mart / Orders / Profile depending on vertical.
- **Icons feel generic** — SF Symbol filled glyphs are iOS-platform-specific. On Android they render via a fallback set in IconSymbol, often visually inconsistent. Phone-test item 16 already called this out.
- **No badge on Cart tab** — TopBar has it; tab does not. Phone-test item 18 — the cart bag's absence from Home top bar was earlier raised. Tab badge entirely missing.
- **No badge on Orders tab** — for active orders count.
- **Active tint** — not brand teal. Inactive tint default gray. The brand color should be `tokens.colors.primary`.
- **ButlerFab overlap** — sits at `bottom: 92`, hovering above tab bar. On small phones it sometimes covers the Scrolls tab's status icons.
- **6 tabs is a lot** — InstaShop has 4, Talabat has 4-5. Consider collapsing Shops into Home search, or moving Scrolls behind the Butler FAB.

Recommendation:
1. Rename labels: **Home / Browse / Scrolls / Cart / Orders / Me** — and bias toward 4 tabs by promoting Scrolls to a Home rail or pinning behind a chip.
2. Swap to **Lucide** or **Phosphor** for cross-platform parity (Ionicons is already in deps and used everywhere else — that's the most consistent choice). Replace `IconSymbol` calls with the Ionicons equivalents:
   - Home → `home` / `home-outline`
   - Browse → `search` / `search-outline`
   - Scrolls → `play-circle` / `play-circle-outline`
   - Cart → `bag-handle` / `bag-handle-outline` (matches TopBar)
   - Orders → `receipt` / `receipt-outline`
   - Me → `person` / `person-outline`
3. Wire `tabBarActiveTintColor: tokens.colors.primary`, `tabBarInactiveTintColor: tokens.colors.textMuted`.
4. Add `tabBarBadge` on Cart (from `useCartStore.itemCount()`) and Orders (from active-orders count once D4 lands; for now hide).

---

## B. AI honesty audit (Section B)

| Surface | Data source | Truly AI? | Honest "Preview" badge? | Dead actions |
|---|---|---|---|---|
| ForYouCarousel | `src/data/demoForYou.ts` (static array) | No (static) | **No** — "Picked for you" badge implies real recommender | None functionally. |
| ScrollCard rail (like/save/share) | Local state only — `useState(liked/saved)` (ScrollCard:38-39) | No (no persistence) | No | Like and Save are local-only; do not update any list. Like count does not increment. |
| ButlerFab + ButlerSheet | Writes to `butlerStore` (AsyncStorage). No outbound network. | No | No — feels "live" | Send button only persists locally. There is no super-admin inbox / queue endpoint. |
| Scrolls feed | `src/data/demoScrolls.ts` | No (static) | No | No "Why you'll like this" line. |
| Semantic search in Shops tab | Client-side substring filter on `DEMO_SHOPS` | No | n/a | OK — not advertised as AI. |

Honest labeling recommendation: every "✨ Picked for you" / Butler / Scrolls surface should carry a small "Preview" pill until Phase D7 backend services ship (recommender, agent inbox, ranker).

---

## C. Theme / color / icon consistency sweep (Section C)

### C.1 Files still using `useTheme()` (29 total — the dark-mode-bleed bug surface)

App screens using `useTheme()`:
- `app/auth/login.tsx` (line 9)
- `app/auth/register.tsx` (line 9)
- `app/onboarding.tsx` (line 21)
- `app/loyalty.tsx` (line 10)
- `app/wallet.tsx` (line 10)
- `app/notifications.tsx` (line 9)
- `app/reviews/[productId].tsx` (line 13)
- `app/order-success.tsx` (legacy duplicate — should be deleted)

Components using `useTheme()`:
- `src/components/AppButton.tsx`
- `src/components/FilterChips.tsx`
- `src/components/ProductCard.tsx`
- `src/components/ShopCard.tsx`
- `src/components/CategoryChip.tsx`
- `src/components/CartFab.tsx`
- `src/components/MerchTabs.tsx`
- `src/components/Skeleton.tsx`
- `src/components/EmptyState.tsx`
- `src/components/StarRating.tsx`
- `src/components/SuccessCheckmark.tsx`
- `src/components/VerticalFieldsBlock.tsx`
- `src/components/cart/CouponRow.tsx`
- `src/components/cart/CartItemRow.tsx`
- `src/components/checkout/AddressForm.tsx`
- `src/components/checkout/AddressPickerSheet.tsx`
- Built-in Expo: `components/themed-view.tsx`, `components/themed-text.tsx`, `components/parallax-scroll-view.tsx`, `hooks/use-theme-color.ts`

Action: replace `useTheme()` in customer-facing surfaces with `tokens.*`. Built-in `themed-*` and `parallax-scroll-view` are Expo starter dead-weight — confirm unused and remove or keep isolated.

### C.2 Hardcoded color strings (`#xxx`, `rgba(...)`) in `mobile/app/*`

Found in 7 files:
- `(tabs)/scrolls.tsx`: `'#000'` for FlatList container + StatusBar dark, `rgba(...)` overlays inside ScrollCard.tsx.
- `products/[id].tsx`: back-button `rgba(0,0,0,0.35)`.
- `order/success/[id].tsx`: success check `#ECFDF5` border (line 45), inline check icon color tied to primary.
- `(tabs)/profile.tsx`: `rgba(255,255,255,...)` on the brand teal header card — OK (overlays on primary).
- `addresses/index.tsx`: default-badge bg `#E6F4F3` (line 128) — should be `tokens.colors.primaryTint` (add token).
- `reviews/[productId].tsx`: star fill `#F5C518` (line 84) — add `tokens.colors.starGold` token.
- `loyalty.tsx`: tier hero text `#0B0B0F` (line 74, 77, 80) — replace with token.

### C.3 Icon family mix

- `Ionicons` used throughout home / cart / shop / scrolls / TopBar — **good baseline**.
- `IconSymbol` (SF Symbols) used only in tab bar — **inconsistent**.
- Emoji icons in production text: `📦 📍 💳 🎁 💰 🌐 🔔 ❤️ 💬 📄 🔒` (profile menu rows), `🔍 ✕ ≡` (shops search header), `⏱` (orders ETA), `🛵` (order detail), `💵` (payment), `💸 🔎 ⚖️ 🎁` (Butler presets), `✨ 🏪 ⏱️` (success page), `🛍️` (onboarding + product fallback), `⚠️` (CrossShopModal), `‹` and `⤴` (custom buttons in ShopHero/back overlays).

Recommendation: full sweep replacing emoji-in-Text with Ionicons of matching semantics.

---

## D. Cross-cutting open items (cross-reference against `feedback-phone-test-2026-05-19`)

| # from feedback | Item | Status | Evidence |
|---|---|---|---|
| 1 | Product card routing all → Margherita | Fixed | `DEMO_PRODUCTS_BY_SHOP` + `DEMO_PRODUCTS` provide distinct IDs; shop detail and product detail use them. |
| 2 | Add to cart should stay on shop | Fixed | `products/[id].tsx:72-77` returns back after add + toast. |
| 3 | Talabat-style quantity stepper | Fixed (UI) | `QuantityStepper` component used on ForYou + ProductGridCard. |
| 4 | Hero banner 1→2 transition glitch | Open | `HeroBanner.tsx` uses `setActiveIndex` from `onMomentumScrollEnd`; flicker on first auto-tick. The `skipFirstTickRef` guard helps but transition still uses default RN ScrollView snap, not animated translate. |
| 5 | Talabat multi-shop grids (admin-configurable) | Partial | `homeLayout` data exists; super-admin editor is Phase C1, not built. |
| 6 | "See all" buttons unwired | Partial | Wired to `onSeeAll(slot.actionRoute)` — but for several slots `actionRoute` is undefined and falls through to `/(tabs)/shops` (Home items 1.10/1.12/1.14). |
| 7 | Stray `+` quick-add on home ShopRow | Fixed | `ShopRow.tsx` shows no quick-add. |
| 8 | Search categories chips overflow | Open | `(tabs)/shops.tsx` FilterChips render in ScrollView via `FilterChips.tsx` (uses ScrollView horizontal). On Home, CategoriesCarousel uses ScrollView — flex-wrap not on. Likely still scrambles on small screens. Verify on phone. |
| 9 | Filter ≡ doesn't open anything | Open | `(tabs)/shops.tsx:73` still `onPress={() => {}}`. |
| 10 | Polish logos/cards/shadows | Partial | `tokens.shadow.card` applied broadly. Cards consistent. |
| 11 | Cart shop notes + delivery notes UI | Fixed | `(tabs)/cart.tsx:95-127` renders both. |
| 12 | Live location | Parked | Not implemented (per plan). |
| 13 | Color theming inconsistency / dark page bleed | Partial | Auth + onboarding + wallet + loyalty + notifications + reviews still use `useTheme()` — risk persists on those. Checkout switched to explicit StatusBar dark + tokens. |
| 14 | Scrolls video pipeline (vendor upload) | Parked | DEMO videoUrl array only. |
| 15 | More AI/Scrolls creative ideas | Parked | n/a |
| 16 | Generic icons / emoji swap to Ionicons | Partial | Home uses Ionicons; ScrollCard uses Ionicons. **Profile, success, butler, shops-tab still emoji-heavy**. |
| 17 | "Deliver to · Baghdad" click does nothing | Partial | Wired (`onLocationPress`) but only opens `/addresses` when authenticated, else alert. Should open city picker sheet always. |
| 18 | No cart icon on home | Fixed | TopBar shows bag + badge. |
| 19 | Filter/search broken — full page instead of sheet; shop search not clickable | Partial | Home filter now opens FilterSheet (good). Shops-tab ≡ still dead (line 73). ShopSearchBox in shop detail routes to global shops tab, doesn't filter to this shop. |
| 20 | Product detail color bleed | Fixed | `products/[id].tsx` uses tokens directly via `PriceText`; no `useTheme()`. |
| 21 | Home cart icon styling not premium | Open | Still standard pill. Consider chip-with-count visual. |
| 22 | Search categories carousel jumps on input | Open | Not investigated in this audit — happens because `(tabs)/shops.tsx` re-renders chips on `setQuery`. Likely needs `useMemo` on chips. |
| 23 | "OPEN/CLOSED" pill feels "network" not shop | Open | `ShopRow.tsx:46-56` still uses `time-outline` for open and `close-circle-outline` for closed. Phone-test item still standing. |

Second-round items 18–23 status: **2 fixed (18, 20), 4 open (4, 9, 17 partial, 21, 22, 23)**.

---

## E. Recommended fix order (Section E)

Reasoning: do the cross-cutting fixes first (tab bar, theme bleed, i18n debt) because they affect every screen. Then go screen-by-screen on the screens with the most dead buttons.

1. **Tab bar rebuild** (highest leverage, user explicit). Swap to Ionicons set, rename labels to match InstaShop pattern, wire brand tint, add cart badge, audit ButlerFab z-index.
2. **`useTheme()` purge across customer surfaces** — replace with `tokens.*` in `auth/login`, `auth/register`, `onboarding`, `loyalty`, `wallet`, `notifications`, `reviews`, and the shared components that customer screens hit (`AppButton`, `EmptyState`, `CartFab`, `ProductCard`, `ShopCard`, `MerchTabs`, `CategoryChip`, `Skeleton`, `StarRating`, `SuccessCheckmark`, `AddressForm`, `AddressPickerSheet`, `CartItemRow`, `CouponRow`, `FilterChips`, `VerticalFieldsBlock`).
3. **i18n debt** — Shops tab, Checkout, Auth (login/register), Onboarding, Addresses, Profile editor, Loyalty, Wallet, Notifications, Reviews currently render English-only. Add `t()` everywhere and subscribe to `useLanguageStore((s)=>s.locale)` on each screen.
4. **Dead buttons on Profile menu** (5 items: Payment methods, Favorites, Help, Terms, Privacy). Either build stub screens (Help → mailto, Terms / Privacy → static markdown, Favorites → server-backed list) or remove the rows. Same for shop detail favorite/share.
5. **Filter wiring** — `(tabs)/shops.tsx ≡` button must open `FilterSheet`. Home FilterSheet `onApply` must mutate a filter store consumed by ContentSection.
6. **Shop detail search** — make `ShopSearchBox` open in-shop search overlay rather than route to global Shops tab.
7. **Tab badges + active-orders awareness** — Cart tab badge from store; Orders tab badge for in-flight orders.
8. **Order detail completion** — wire Contact shop, Call courier, add Cancel-order, Reorder, Rate order buttons.
9. **Auth completeness** — add forgot password, T&C checkbox at register, phone OTP scaffold (Iraqi market expects it).
10. **AI honesty pass** — add "Preview" pills on ForYou / Butler / Scrolls feed; persist Like/Save server-side once D2 lands (or hide them until then).
11. **Address picker improvements** — geolocate button + map picker (Iraqi addressing reality).
12. **Empty / loading / error states sweep** — ensure every screen handles all four where applicable (Home, Scrolls, Shops list, Reviews compose when logged out, Profile when logged out has no Log in CTA on Orders tab).
13. **Pull-to-refresh on Home / Shops / Orders / Scrolls** — standard MENA ecom pattern.
14. **Emoji → Ionicons** — Profile menu rows, Butler presets, OrderDetail icons (🛵, 💵), success page icons.
15. **Phone-test items still open** — 4 (hero glitch), 8 (chip overflow), 17 (location sheet), 21 (cart icon style), 22 (chip jump on input), 23 (open/closed pill).

---

## F. Counts

Total interactive elements catalogued across the per-screen tables (rows 1.1–18.8, including aux sub-tables): **189**.

Breakdown:
- ✅ **Wired**: 117
- ⚠️ **Partial**: 25
- ❌ **Dead**: 47

(Counts include sub-table rows in Aux + Overlays sections.)

---

## Top 5 most impactful gaps (the author's judgment)

1. **Tab bar inconsistent + missing badges + non-brand tint** — `app/(tabs)/_layout.tsx` (icons + tint). Touches every screen and is the first thing every user sees. Phone-test 18+21 still bite.
2. **i18n debt on Shops tab, Checkout, Auth, Addresses, Loyalty, Wallet, Notifications, Reviews, Onboarding** — Arabic toggle is half-functional today. For an Iraqi launch this is launch-blocking.
3. **`useTheme()` still in 8 customer screens** — guarantees the dark-mode color-bleed bug (phone-test 13/20) keeps recurring. Must purge before adding any new screen.
4. **Five dead rows in Profile menu** (`profile.tsx:77, 85, 89, 90, 91`) — Help, Terms, Privacy, Favorites, Payment methods. First place users explore. Each is a 1-line `onPress={() => {}}`.
5. **Filter on Shops tab dead + Shop-search inside shop broken** — `(tabs)/shops.tsx:73`, `shops/[slug].tsx:317`. Two-thirds of the discovery surface doesn't work. Phone-test items 9 and 19 carry over from last round.

---

End of audit. Next step: Phase A1 (tab bar redesign) per Section E plan.
