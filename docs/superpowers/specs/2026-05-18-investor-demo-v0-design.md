# Investor Demo v0 — Design Spec

**Status:** Approved by user 2026-05-18. Ready for implementation planning.
**Owner:** Hamza (`2ngryprogrammer@gmail.com`)
**Timeline:** 3 weeks (revised from 2 weeks after Phase-I scope additions)
**Goal:** A live, deployable, demoable version of Hanoot — the InstaShop-style multi-vertical super-app — that can be put on a real phone and shown to investors / partners for buy-in.

---

## 1. Scope & content

### 1.1 Verticals + demo shops

Five verticals, each with exactly **one fully-built demo shop** so every category tile in the app leads somewhere real. Breadth-first per user choice (vs. fewer verticals deep).

| Vertical | Demo shop | Products | Primary currency | Per-vertical UI hooks |
|---|---|---|---|---|
| 🍔 Food / Restaurant | Hamza's Kitchen | 6 | IQD | prep_minutes, spice_level, modifiers, allergens |
| 🛒 Groceries | FreshMart | 8 | IQD | unit (kg/g), organic, expiry_date, origin |
| 👕 Fashion | Style Hub | 6 | USD | sizes (S/M/L/XL), colors, material, gender |
| 🎧 Electronics | TechPoint | 5 | USD | brand, model, specs, warranty_months |
| 🏠 Home & Household | Bayti (بيتي) | 7 | IQD | room (kitchen/bath/bedroom/living), material, dimensions, care_instructions |

**Bayti's 7 products** (supermarket-style household goods, excluding edible groceries):
1. Stainless steel cookware set (kitchen)
2. Bath towel set (bathroom)
3. Cotton bedding set (bedroom)
4. Cleaning supplies bundle — detergent, dish soap, multi-surface (kitchen/bath)
5. Aromatic candle (living)
6. Electric kettle (kitchen)
7. Picture frame set (living)

**Total: 32 demo products** across 5 shops. Each shop has logo, banner, branding color, delivery zone, opening hours, mock rating (4.5–4.9).

### 1.2 Product imagery

- v0: **4 Unsplash images per product** (hero / detail / lifestyle / packaging-or-secondary-angle), consistent dimensions, square crops
- Total images: 32 × 4 = **128 images** sourced + dimensioned during the content seed step
- Mobile + storefront product detail screen shows a horizontal swipeable image carousel with 4 dots
- Phase II: per-tenant photo upload via vendor portal (replaces Unsplash with real shop photos)

### 1.3 Demo accounts

| Account | Purpose | Pre-loaded state |
|---|---|---|
| `2ngryprogrammer@gmail.com` (admin) | Super-admin login for Medusa Admin | full access |
| `demo@hanoot.app` (customer "Investor Demo") | Clean account for live actions during demo | empty cart, no orders |
| `returning@hanoot.app` (customer "Returning") | Demo of loaded state if needed | 3 past orders, 2 unread notifications, silver tier (2,300 pts), $50 wallet |
| 5 vendor accounts | One per shop, for vendor portal walkthrough | each scoped to their tenant's sales channel |

---

## 2. Brand identity & polish

### 2.1 Name

**Hanoot** (حانوت) — Arabic for "local shop / corner store." Memorable, culturally rooted in MENA, conveys the differentiation (local-shops-first, not generic aggregator).

### 2.2 Color system

| Token | Light | Dark |
|---|---|---|
| `primary` | `#0F766E` teal | `#14B8A6` brighter teal |
| `accent` | `#F59E0B` saffron | `#FBBF24` warm gold |
| `background` | `#FFFFFF` | `#0B0B0F` |
| `surface` | `#F7F7F8` | `#15151B` |
| `text` | `#0B0B0F` | `#F7F7F8` |
| `textMuted` | `#6B7280` | `#9CA3AF` |
| `border` | `#E5E7EB` | `#27272A` |
| `danger` | `#DC2626` | `#F87171` |
| `success` | `#16A34A` | `#4ADE80` |

Replace existing mobile theme with this palette.

### 2.3 Typography

`system-ui` everywhere. Falls back to native Arabic font on iOS (SF Arabic) and Android (Roboto Arabic). No external font load → faster splash, no FOUT.

### 2.4 Animations (subtle, not messy)

Already in place (✅ keep):
- Onboarding bag floats + scales in
- Product card spring on press + add-to-cart ✓ flash
- Skeleton loaders pulsing
- FadeIn helper for staggered reveals

Add (3 only — keep it tasteful):
- **Tab bar active-icon bounce** when tab changes (Reanimated spring)
- **Cart badge tick** — small spring scale when item count changes
- **List item stagger** — first 6 items in product grid fade in with 60ms delay between

Explicitly **not adding** (would feel noisy): parallax hero, page-slide transitions, Lottie confetti.

### 2.5 App icon + splash

- Icon: SVG-generated "H" mark on saffron background, rounded
- Splash: same mark centered, dark/light variants
- Output paths: `mobile/assets/images/icon.png` + `splash-icon.png`

### 2.6 MENA UX touches (all 6 in)

1. **One-tap reorder** on Orders tab (each past order has a "Reorder" button)
2. **Live order tile** on Shop tab when an active order exists (mocked cycling status: Preparing → Out for delivery → Delivered)
3. **Featured shops carousel** above category chips on home
4. **Trust signals** on shop cards: ★ rating + "30 min avg" + ✓ Verified badge
5. **Hero banner** — 3 static promo slides (auto-rotate every 4s) at top of home
6. **Delivery time chip** ("30 min", "1-2 hr") on every product card

---

## 3. Multi-currency

### 3.1 Per-shop primary currency

Extend the existing `Tenant` model (in `backend/apps/backend/src/modules/tenant/models/tenant.ts`) with two new columns:

```ts
display_currency: model.enum(["IQD", "USD"]).default("IQD")
show_secondary:   model.boolean().default(false)
```

Then `npx medusa db:generate tenant` + `npx medusa db:migrate` to apply.

A shop displays only its primary currency unless `show_secondary` is true, in which case a small, muted secondary line appears (e.g., "$12.50" below "16,375 IQD").

### 3.2 IQD formatting

- No decimals (IQD has no minor unit in practice)
- Thousand separators: `15,000 IQD` (symbol after the number, Arabic convention)
- Rounded to nearest integer at storage time (vendor portal validates)

### 3.3 USD formatting

Standard `Intl.NumberFormat`: `$12.50`, `$1.99`.

### 3.4 FX rate

v0: static config in backend `.env`:

```
FX_USD_TO_IQD=1310
```

**TODO (Phase II):** wire to a real FX API (e.g., exchangerate.host) with daily refresh + cache.

### 3.5 No customer-side override

Customer sees the shop's primary currency. No setting to flip globally. Keeps display predictable and aligns with how the shop actually quotes prices.

### 3.6 Backend regions

Two Medusa regions:
- **Iraq (IQD)** — countries: `iq`. Default for IQ-detected customers.
- **International (USD)** — countries: rest of world. Default otherwise.

Each shop's products carry the price in their primary currency only. The dual-display line (when enabled) is a presentation-layer computation from `FX_USD_TO_IQD`, never written to the DB.

### 3.7 Shop currency assignments for demo

| Shop | Primary |
|---|---|
| Hamza's Kitchen | IQD |
| FreshMart | IQD |
| Style Hub | USD |
| TechPoint | USD |
| Bayti | IQD |

This split itself is a demo moment ("watch the price display flip per shop based on how each shop actually quotes").

---

## 4. Architecture & deployment

### 4.1 Everything on the Hostinger VPS

```
                    srv1162617.hstgr.cloud  (Caddy auto-HTTPS)
                                 │
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                  ▼
       Medusa backend      Next.js storefront   Next.js vendor portal
         :9000                  :8000                :9100
              │
       Postgres 16
        (Docker)
```

Single VPS, Docker Compose, Caddy reverse proxy. Mobile + web both call the backend HTTPS API. **No Vercel** — one billing surface, simpler ops.

### 4.2 Domain

- v0: `srv1162617.hstgr.cloud` (Hostinger reverse-DNS, free, Caddy issues Let's Encrypt cert automatically)
- Post-demo: buy real domain

### 4.3 Release pipeline

```
git push main
  ↓
GitHub Actions:
  1. Build 3 Docker images (backend, storefront, vendor)
  2. Push to ghcr.io/{GITHUB_USERNAME}/hanoot-{backend,storefront,vendor}
  3. Call Hostinger Docker API → redeploy stack
  ↓
~3 min later → https://srv1162617.hstgr.cloud updated
```

`GITHUB_USERNAME` is set in GitHub repo secrets during day-1 setup. Hostinger API token (`HOSTINGER_API_TOKEN`) and ghcr.io publishing scopes (`GITHUB_TOKEN`, scoped to `packages:write`) also live as repo secrets — never committed.

Setup is one-time. After that, every commit deploys.

### 4.4 Mobile distribution

**v0: Expo Go** — phone scans QR, runs the dev bundle live, talks to live backend. No native build needed.

**Phase II:** EAS Build → native APK + IPA → app stores.

For investor demo: scanning QR with Expo Go on the demoer's own phone is sufficient. The mobile app icon during the demo is the Expo Go icon, not Hanoot's — acceptable trade-off vs. a 2-day EAS setup.

If we have time in week 2, we add EAS preview APK as a stretch goal so investors can also install on their phone after the meeting.

### 4.5 Required accounts (you create)

1. **GitHub** — already have
2. **Expo** — sign up at expo.dev for Expo Go QR / EAS later. Free.
3. **Hostinger** — already have
4. *(deferred)* Domain registrar — when ready to buy real domain

### 4.6 Backup demo video

I produce a `docs/demo/demo-video-script.md` with the exact words + screen sequence. You screen-record the demo once, edit lightly, save to Google Drive as `demo-fallback.mp4`. If live demo breaks during pitch, play the video. Insurance.

---

## 5. Phase I additions (added late in design — high investor-facing value)

These four features were originally Phase II; user moved them up because they meaningfully strengthen the demo. ~7-8 days of added work, hence the timeline stretch to 3 weeks.

### 5.1 TikTok-style discovery feed ("Scrolls")

A vertical full-screen swipeable feed of products — Lezzoo's most-loved feature. Each card fills the screen, swipe up reveals next product. Personalized later via embeddings; for v0 the order is curated.

**Mobile screen**: new tab or floating-action entry from Shop tab.
- New file: `mobile/app/feed.tsx`
- Vertical `FlatList` with `pagingEnabled` + `snapToInterval={screenHeight}`
- Each item: full-bleed hero image + product title + shop name + price + ★ rating + "Add to cart" pill + "Save" heart
- Reanimated overlay text fades in as item snaps
- Initial dataset: 32 demo products randomized

**Backend**: reuse existing `/store/products` with a `?feed=true` flag (returns random ordering for v0; embedding-based ranking comes later).

**Demo value**: visible in 5 seconds, "TikTok for shopping" is an instantly understood pitch.

### 5.2 Butler / concierge service (Toters pattern)

Customer describes what they want — even if not in our catalog — and the platform finds someone to get it.

**Mobile screen**: new screen at `mobile/app/butler.tsx`, entry point from Profile or a small CTA tile on Home.
- Form: "What do you need?" textarea + delivery address + budget ceiling (optional)
- "Send request" button → shows confirmation + estimated response time

**Backend**:
- New custom module `butler` with single table `butler_request(id, customer_id, description, address, budget_cents, status, assigned_to, created_at)`
- `POST /store/butler-requests` — customer creates
- `GET /admin/butler-requests` + `POST /admin/butler-requests/{id}/assign` — admin views queue + assigns to a shopper

**Demo value**: differentiator vs. Talabat. Investors recognize the Toters butler pattern; we show it works.

### 5.3 Full English + Arabic i18n with RTL

Already-scaffolded i18n keys get used throughout the app, with full RTL support and a language switcher.

**Mobile**:
- Add `expo-localization` package; init on app boot via `initLocale(Localization.getLocales()[0]?.languageCode)`
- Toggle `I18nManager.forceRTL(isRTL())` and require app reload when switching (standard RN pattern)
- Replace all hardcoded English strings with `t('key')` calls (mostly already keyed; need to wire in 8-10 screens)
- Profile → Settings → Language selector (English / العربية)
- New strings to add to `en.ts` and `ar.ts`: butler, scrolls feed, reviews, wallet, loyalty, notifications, payment provider labels

**Storefront (Next.js)**:
- Use `next-intl` or built-in routing: `/en/*` and `/ar/*` paths
- Mirror keys from mobile i18n catalog

**Vendor portal**:
- English only at v0 (vendors are tech-comfortable; defer AR to Phase II)

**Demo value**: at the demo, switch to Arabic mid-flow — the entire app flips RTL and re-renders. Powerful "this is built for MENA, not retrofitted" moment.

### 5.4 Post-order reviews / ratings flow

Customer rates the order after delivery; review feeds into shop average rating and per-product ratings.

**Backend** (already exists, just needs subscriber + frontend wiring):
- `reviews` module has `ProductReview` + `ShopReview` entities ✅
- Add subscriber on `order.completed` event → creates an in-app notification: "Rate your order from [shop]"
- Existing endpoints `POST /store/reviews/products/{id}` + `POST /store/reviews/shops/{id}` already work

**Mobile**:
- New screen `mobile/app/reviews/order/[id].tsx` — order-level review with:
  - Overall stars (1-5) for the shop
  - Delivery rating, packaging rating, accuracy rating (optional)
  - Free-text comment
  - Per-product mini-rating (star row beside each ordered product)
  - "Submit" button → POSTs to backend, marks notification read
- Notification inbox shows "Rate your order from [shop]" as a tappable card → opens this screen
- Shop detail screen + product detail screen show aggregate rating + recent reviews

**Demo value**: shows the loop — customer → shop → review → shop reputation. Investors recognize the network-effect mechanic.

---

## 6. Three-week timeline (revised from 2 weeks after Phase I additions)

| Week | Day | What lands | Owner |
|---|---|---|---|
| **1: Foundation** | 1 | GitHub repo connected, Expo account, code pushed, Hostinger API token in repo secrets | You signup, I push |
|  | 2 | GitHub Actions builds 3 images → ghcr.io; first deploy via Hostinger Docker API; Caddy issues HTTPS cert on srv1162617.hstgr.cloud | Me |
|  | 3 | All 5 demo shops created in Medusa Admin with logos, banners, products, prices in correct currencies, 4 images/product | Me |
|  | 4 | Brand swap to Hanoot (name, colors, icon, splash) across mobile + storefront + vendor portal | Me |
|  | 5 | Multi-currency wiring: tenant.display_currency + show_secondary, PriceText extended | Me |
|  | 6 | Mobile UX additions: featured shops carousel, hero banner, delivery time chip, live order tile, reorder button, trust signals | Me |
|  | 7 | Buffer / catch-up day | — |
| **2: Phase I features** | 8 | i18n full pass: wire `t()` everywhere in mobile + Profile language switcher + RTL toggle | Me |
|  | 9 | i18n storefront (Next.js routing /en/* /ar/*) | Me |
|  | 10 | Scrolls feed screen + backend `?feed=true` flag + 32-product carousel | Me |
|  | 11 | Butler module + admin queue UI + mobile request form | Me |
|  | 12 | Reviews flow: post-order screen, notification on order.completed, shop-aggregate display | Me |
|  | 13 | AI agent demo seeding (embeddings for all 32 products, tested chat queries) | Me |
|  | 14 | Subtle animations layer (tab bounce, cart tick, list stagger) | Me |
| **3: Polish & demo prep** | 15 | Vendor portal polish: branded dashboard, multi-vertical form switcher demo-friendly | Me |
|  | 16 | End-to-end smoke test of the full demo script | Me |
|  | 17 | First dry-run with you | Together |
|  | 18 | Bug fixes from dry-run | Me |
|  | 19 | Backup demo video recording | You |
|  | 20 | Final dry-run + roadmap PDF + leave-behind one-pager | Together |
|  | 21 | Buffer day | — |

### 6.1 If we slip

Highest-priority cuts (drop in this order if behind):
1. EAS Build APK (Expo Go works for the demo)
2. Subtle animations (existing 3 are enough)
3. Storefront i18n /ar/* routing (mobile i18n is the demo-visible piece)
4. Butler service (nice-to-have, AI agent is the differentiator focus)
5. Live order tile + reorder button + featured shops carousel (nice-to-have)

Things we **don't cut**:
- Live deployment on Hostinger (the whole point)
- All 5 shops with products
- AI agent with deep-link actions
- Vendor portal per-vertical form switcher
- Mobile + web both working
- Mobile i18n + RTL toggle (one of the biggest "wow" moments)
- Reviews/ratings UI
- Scrolls feed

## 7. Risks + mitigations

| Risk | Probability | Mitigation |
|---|---|---|
| Hostinger Docker API rate limits or downtime | Low | We test deploys daily from day 2; backup is manual deploy via Docker compose if hPanel browser terminal becomes available |
| Demo phone loses Wi-Fi mid-pitch | Medium | Backup video; also pre-load demo on second phone |
| AI agent returns weird responses live | Medium | Use rule-based intents (no live LLM call) for demo queries; pre-test exact phrasings |
| Vendor portal Node 25 SSR error returns | Low | Pinned Next.js 14.2.20 + React 18.3.1 (verified working) |
| Investor asks "Show me the code" | Low | GitHub repo public-readable; we ensure README + MASTER_PLAN.md are visible |
| User's ISP blocks the demo IP during pitch | Medium | If demo is at investor's office on their Wi-Fi, this resolves; if at user's network, switch to mobile hotspot |

---

## 8. Phase II (post-demo, in roadmap PDF only)

Listed here so it's captured in the spec but explicitly out of v0 scope. Note: TikTok feed, butler, i18n, reviews originally lived here but were promoted to Phase I per user direction.

- Driver app (Expo) + dispatch system
- Real-time order tracking (websockets)
- In-app games while waiting (Lezzoo pattern)
- Subscription tier (Talabat Pro pattern — free delivery + discounts)
- Stripe Connect for marketplace payouts
- Real ZainCash / Qi Card live credentials
- Push notifications fully wired (token registration on login + FCM/APNs)
- pgvector for semantic search at scale
- Real-time FX API integration (replaces static `FX_USD_TO_IQD`)
- Native iOS + Android app store submissions (EAS Build → Play Store + App Store)
- Per-tenant white-label EAS Build pipeline (dedicated shop apps with custom domains)
- KYC for vendor onboarding (manual now, integrated KYC service later)
- Vendor portal in Arabic (currently English only; mobile + storefront have AR in Phase I)
- Loyalty challenges + gamification (daily/weekly missions)
- Multi-warehouse inventory + transfers
- Audit log viewer in admin

---

## 9. Files that will be created or significantly modified

(Not exhaustive — full file list comes in the implementation plan.)

### Backend (`backend/apps/backend/`)
- `medusa-config.ts` — register new `butler` module
- `src/modules/tenant/models/tenant.ts` — add `display_currency` + `show_secondary` columns
- `src/modules/butler/` — new module: index, service, model `butler_request`
- `src/api/store/butler-requests/route.ts` — new (customer creates)
- `src/api/admin/butler-requests/route.ts` + `[id]/assign/route.ts` — new (admin manages)
- `src/api/store/products/route.ts` — extend with `?feed=true` parameter for Scrolls
- `src/subscribers/review-prompt-on-order-complete.ts` — new (creates inbox notification on `order.completed`)
- `src/scripts/seed-demo-shops.ts` — new: creates 5 tenants, 5 sales channels, 32 products, vertical fields, demo accounts, 4 images/product
- `src/scripts/seed-embeddings.ts` — new: indexes all 32 products for AI semantic search
- `.env` — add `FX_USD_TO_IQD=1310`

### Mobile (`mobile/`)
- `app.json` — name "Hanoot", icon, splash
- `assets/images/icon.png` + `splash-icon.png` — new generated assets
- `src/theme/colors.ts` — replace palette with teal+saffron
- `src/i18n/` — wire `initLocale` on boot, add missing keys for butler/scrolls/reviews/wallet/loyalty
- `app/_layout.tsx` — call `initLocale()` + apply `I18nManager.forceRTL`
- `app/(tabs)/index.tsx` — hero banner carousel, featured shops, live order tile
- `app/(tabs)/orders.tsx` — reorder button
- `app/feed.tsx` — new (Scrolls TikTok-style feed)
- `app/butler.tsx` — new (concierge request form)
- `app/reviews/order/[id].tsx` — new (post-order review screen)
- `app/profile/settings.tsx` — new (language switcher)
- `src/components/PriceText.tsx` — extend for dual-currency (primary + optional secondary line)
- `src/components/HeroBanner.tsx`, `FeaturedShopsCarousel.tsx`, `LiveOrderTile.tsx`, `DeliveryTimeChip.tsx`, `TrustBadges.tsx` — new
- `src/components/ProductImageCarousel.tsx` — new (4-image swipe on product detail)
- `src/components/RatingStars.tsx` — new (interactive 1-5 star input for reviews)
- 3 animation additions in existing tab/cart components

### Storefront (`backend/apps/storefront/`)
- Brand customization (logo, colors)
- Hero on landing page
- i18n routing `/en/*` and `/ar/*` via `next-intl`

### Vendor portal (`backend/apps/vendor/`)
- Brand customization
- Dashboard polish for walkthrough

### Deploy (`deploy/` + `.github/workflows/`)
- `docker-compose.prod.yml` — extend with storefront + vendor portal containers
- `Caddyfile` — extend for 3 subpaths (api, web, vendor) all on `srv1162617.hstgr.cloud`
- `.github/workflows/deploy.yml` — new: build 3 images, push to ghcr.io, trigger Hostinger Docker API
- `deploy/hostinger-deploy.sh` — new: the API call payload

### Docs (`docs/`)
- `demo/demo-video-script.md` — new
- `demo/roadmap.md` — new (source for PDF leave-behind)
- `demo/pitch-script.md` — new (the verbal narration during the live demo)
- `demo/qa-prep.md` — new
- `MASTER_PLAN.md` — update with v0 milestone, mark Phase II clearly

---

## 10. Success criteria

The demo is considered successful if:

1. **It runs end-to-end live** without crashes or visible bugs during the 5-minute script
2. **A non-technical investor understands** the multi-vertical + AI + multi-tenant story without further explanation
3. **The investor asks at least one of**: "How soon can you onboard a real shop?", "What's the ask?", "Can I see the financials?" — meaning they're past the "is it real?" question
4. **Backup video plays cleanly** if invoked

Failure modes we explicitly avoid:
- "It's still rough" (everything visible must feel finished)
- "Show me the iOS version" (we have a graceful "Phase II native" answer)
- "Where does my data go?" (we show the vendor portal + Medusa Admin to prove the platform is real)

---

## 11. Demo choreography (script — finalized at end-of-build)

This section is intentionally last because it depends on what we actually build. Will be re-validated during week-3 dry runs.

### 11.1 Length

~6-7 minutes live demo + 4-5 minutes Q&A. Slightly longer than the 5-min original because we now demonstrate the Phase-I additions (Scrolls feed, RTL toggle, reviews).

### 11.2 The script (draft, refine in week 3)

| Time | What happens |
|---|---|
| 0:00–0:30 | **Hook.** "MENA spends $4B/yr on food delivery. Talabat just bought InstaShop for $32M. Toters raised $18M for Iraq. The gap: marketplace + AI agent + white-label SaaS in one. We do — meet Hanoot." Open app → onboarding plays → home with 5 category tiles. |
| 0:30–2:00 | **Customer journey.** Tap Food → Hamza's Kitchen → pizza (prep time badge visible, 4-image carousel swipes). Add to cart (✓ flash). Switch to Bayti (Home & Household) → kettle → different per-vertical fields render. Cart → Checkout → shipping form pre-filled → payment picker (5 options shown) → Cash on delivery → Place order → success animation. |
| 2:00–2:45 | **Scrolls feed.** Open Scrolls tab → full-screen swipeable product feed → swipe through 4 products from different shops, tap "Add to cart" on one. Soundbite: "TikTok meets shopping. Discovery as scrolling, not searching." |
| 2:45–3:30 | **AI shopping agent moment.** Open chat → type "I need a gift for my mom's birthday" → AI replies with action buttons (`[Open Bayti]`, `[Open Aromatic Candle]`, etc.) → tap one → deep-link into product. Soundbite: "No MENA player has this. Customers don't search — they ask." |
| 3:30–4:00 | **Arabic moment.** Profile → Settings → switch language to العربية → app reloads in full RTL with Arabic text → swipe home → everything mirrored. Soundbite: "Built for MENA from day one, not retrofitted." |
| 4:00–5:00 | **Vendor portal walkthrough.** Switch to laptop with two browser profiles pre-opened: Hamza's Kitchen (food) + Bayti (home). In food tab, click "+ New product" → form shows prep_minutes, spice_level, allergens. Switch to home tab → form re-renders with room, material, dimensions. Soundbite: "Per-vertical product templates. Other super-apps force one schema. We don't." |
| 5:00–5:30 | **Web + multi-tenancy.** Open `https://srv1162617.hstgr.cloud` in browser. Same backend, web storefront. Brief flip. Soundbite: "Same backend powers mobile, web, vendor portal — multi-tenant by design." |
| 5:30–6:30 | **Roadmap + ask.** Single PDF slide. ✅ Today (mobile + web + vendor + AI + Scrolls + i18n + reviews) / 🚀 Phase II (driver app, real-time tracking, in-app games, subscription, Stripe Connect) / 💰 Ask. Close. |

### 11.3 Pre-demo checklist (the morning of)

- [ ] All 3 services responding HTTPS on `srv1162617.hstgr.cloud`
- [ ] Mobile phone connected to internet, Expo Go open, QR scanned, app loaded
- [ ] Demo customer account logged in on phone, language set to English (we switch to Arabic mid-demo for the wow moment)
- [ ] Laptop: two browser profiles pre-opened (Hamza's Kitchen vendor + Bayti vendor); web storefront tab; roadmap PDF tab
- [ ] Backup demo video on Google Drive, link tested on backup device
- [ ] Phone fully charged, screen brightness up, do-not-disturb on

### 11.4 Top 5 Q&A prep (rehearsed answers)

1. **"What's your edge vs Talabat?"** → AI agent (no MENA player has this) + open vendor portal + white-label tier. Talabat is a closed aggregator; we're a marketplace + SaaS.
2. **"How do you make money?"** → Commission per order (15-30%, vertical-dependent, matching Talabat/Toters benchmarks) + premium subscription tier for white-label dedicated apps ($300/mo per shop).
3. **"Why Iraq?"** → $3B+ ecommerce, 25%+ YoY growth, 70%+ smartphone penetration, only 3 incumbents (Talabat, Toters, Lezzoo) with limited multi-vertical depth, no AI-first competitor.
4. **"Team?"** → (your story)
5. **"Time to break even per shop?"** → 3-4 weeks once onboarded (Talabat/Toters benchmark); lower CAC than competitors because of white-label angle attracting shops directly.

### 11.5 What we explicitly DON'T demo

- Real payments (no merchant accounts yet — adapters exist but stub mode)
- Driver app / live tracking (Phase II)
- Real-time order updates (mocked cycling on the Live order tile only)
- In-app games / social (Phase II)
- The 65 backend endpoints (internal detail — say "13 modules, fully documented" if asked)
