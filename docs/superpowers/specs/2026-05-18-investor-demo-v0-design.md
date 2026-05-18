# Investor Demo v0 — Design Spec

**Status:** Approved by user 2026-05-18. Ready for implementation planning.
**Owner:** Hamza (`2ngryprogrammer@gmail.com`)
**Timeline:** 2 weeks
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
| 🌹 Flowers | Petals & Co | 4 | IQD | stem_count, occasion_tags, delivery_date_required, freshness_days |

**Total: 29 demo products** across 5 shops. Each shop has logo, banner, branding color, delivery zone, opening hours, mock rating (4.5–4.9).

### 1.2 Product imagery

- v0: Unsplash free images, one per product, dimensions consistent
- Phase II: per-tenant photo upload via vendor portal

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
| Petals & Co | IQD |

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

## 5. Demo choreography

### 5.1 Length

5 minutes live demo + 5 minutes Q&A = 10 minutes total.

### 5.2 The script

| Time | What happens |
|---|---|
| 0:00–0:30 | **Hook.** "MENA spends $4B/yr on food delivery. Talabat just bought InstaShop for $32M. Toters raised $18M for Iraq. The gap: nobody combines marketplace + white-label SaaS + AI discovery. We do — meet Hanoot." Open app → onboarding plays → home with 5 category tiles. |
| 0:30–2:00 | **Customer journey.** Tap Food → Hamza's Kitchen → pizza (show prep time badge) → add to cart (✓ flash). Switch to Flowers → red roses (show stem count + occasion tags — *different fields per vertical*). Cart → Checkout → shipping form pre-filled → payment picker (5 options shown) → Cash on delivery → Place order → success animation. |
| 2:00–3:00 | **AI shopping agent moment.** Open chat → type "I need a gift for my mom's birthday" → AI returns reply + tappable action buttons (`[Open Petals & Co]`, `[Open Red Roses Bouquet]`) → tap one → deep-link into the product. Soundbite: "No MENA player has this. Customers don't search — they ask." |
| 3:00–4:00 | **Vendor portal walkthrough.** Switch to laptop where **two browser tabs are pre-opened**: tab 1 logged in as Hamza's Kitchen (food vendor), tab 2 logged in as Petals & Co (flower vendor). Each tab uses a separate browser profile/cookie jar so sessions don't collide. In tab 1, click "+ New product" → form shows prep_minutes, spice_level, allergens. Cmd+click tab 2 → form re-renders with stem_count, occasion_tags, delivery_date_required. Soundbite: "Per-vertical product templates. Other super-apps force one schema on every shop. We give each shop only the fields that make sense." |
| 4:00–4:30 | **Web + multi-tenancy.** Open `https://srv1162617.hstgr.cloud` in browser. Same backend, web storefront. Soundbite: "Same backend powers mobile, web, and the vendor portal. Tomorrow when a shop wants their own white-label app on their own domain, we deliver it from the same backend — multi-tenant by design." |
| 4:30–5:00 | **Roadmap + ask.** Single PDF slide. ✅ Today / 🚀 Phase II (driver app, real-time tracking, in-app games, TikTok discovery, subscription, Stripe Connect) / 💰 Ask. Close. |

### 5.3 Pre-demo checklist (the morning of)

- [ ] All 3 services responding HTTPS on `srv1162617.hstgr.cloud`
- [ ] Mobile phone connected to internet, Expo Go open, QR scanned, app loaded
- [ ] Demo customer account logged in on phone
- [ ] Laptop browser tabs open: vendor portal (food vendor logged in) + web storefront + roadmap PDF in same tab order as script
- [ ] Backup demo video on Google Drive, link tested
- [ ] Phone fully charged, screen brightness up

### 5.4 Top 5 Q&A prep (rehearsed answers)

1. **"What's your edge vs Talabat?"** → AI agent + open vendor portal + white-label tier. Talabat is a closed aggregator; we're a marketplace + SaaS.
2. **"How do you make money?"** → Commission per order (15-30%, vertical-dependent, matching Talabat/Toters benchmarks) + premium subscription tier for white-label dedicated apps ($300/mo per shop).
3. **"Why Iraq?"** → $3B+ ecommerce, 25%+ YoY growth, 70%+ smartphone penetration, only 3 incumbents (Talabat, Toters, Lezzoo) with limited multi-vertical depth, no AI-first competitor.
4. **"Team?"** → (your story)
5. **"Time to break even per shop?"** → 3-4 weeks once onboarded (Talabat/Toters benchmark); lower CAC than competitors because of white-label angle attracting shops directly.

### 5.5 What we explicitly DON'T demo

- Real payments (no merchant accounts yet)
- Driver app / live tracking (Phase II)
- Real-time order updates (mocked cycling on the Live order tile only)
- In-app games / TikTok feed / social (Phase II)
- The 65 backend endpoints (internal detail — say "13 modules, fully documented" if asked)

---

## 6. Two-week timeline

| Day | What lands | Owner |
|---|---|---|
| 1 | GitHub repo connected, Expo account, code pushed | You signup, I push |
| 2 | GitHub Actions builds 3 images → ghcr.io; first deploy via Hostinger Docker API; Caddy issues HTTPS cert on srv1162617.hstgr.cloud | Me |
| 3 | All 5 demo shops created in Medusa Admin with logos, banners, products, prices in correct currencies | Me |
| 4 | Brand swap to Hanoot (name, colors, icon, splash) across mobile + storefront + vendor portal | Me |
| 5 | New mobile features: featured shops carousel, hero banner, delivery time chip on cards, live order tile, reorder button | Me |
| 6 | Vendor portal polish — branded dashboard, vertical template viewer visible, walkthrough-friendly | Me |
| 7 | AI chatbot demo data — seed product embeddings for all 29 products so semantic search returns good action buttons | Me |
| 8 | Animations layer — 3 subtle additions (tab bounce, cart tick, list stagger) | Me |
| 9 | End-to-end smoke test of the demo script. Fix anything that breaks. | Me |
| 10 | Dry-run the demo script with you. Iterate. | Together |
| 11 | Record backup demo video | You |
| 12 | Roadmap PDF + leave-behind one-pager | Me |
| 13 | Final dry-run + bug fixes | Together |
| 14 | Buffer day | — |

### 6.1 If we slip

Highest-priority cuts (drop in this order if behind):
1. EAS Build APK (stretch goal anyway — Expo Go works)
2. New animations (3 already in place are enough)
3. Hero banner + carousel (nice-to-have)
4. Reorder button + live order tile (nice-to-have)

Things we **don't cut**:
- Live deployment on Hostinger
- All 5 shops with products
- AI agent with deep-link actions
- Vendor portal per-vertical form switcher
- Mobile + web both working

---

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

Listed here so it's captured in the spec but explicitly out of v0 scope:

- Driver app (Expo) + dispatch system
- Real-time order tracking (websockets)
- In-app games while waiting (Lezzoo pattern)
- TikTok-style food discovery feed (Lezzoo "Scrolls" pattern)
- Toters-style butler/concierge service
- Subscription tier (Talabat Pro pattern — free delivery + discounts)
- Stripe Connect for marketplace payouts
- Real ZainCash / Qi Card live credentials
- Push notifications fully wired (token registration on login)
- pgvector for semantic search at scale
- Real-time FX API integration
- Native iOS + Android app store submissions
- Per-tenant white-label EAS Build pipeline
- KYC for vendor onboarding
- Multi-language (English + Arabic UI throughout, already scaffolded)

---

## 9. Files that will be created or significantly modified

(Not exhaustive — full file list comes in the implementation plan.)

### Backend (`backend/apps/backend/`)
- `medusa-config.ts` — verify all 13 modules registered
- `src/scripts/seed-demo-shops.ts` — new: creates 5 tenants, 5 sales channels, 29 products, vertical fields, demo accounts
- `src/scripts/seed-embeddings.ts` — new: indexes all products for AI semantic search
- `src/api/store/.../price-with-secondary.ts` — new helper for dual-currency rendering data

### Mobile (`mobile/`)
- `app.json` — name "Hanoot", icon, splash
- `assets/images/icon.png` + `splash-icon.png` — new generated assets
- `src/theme/colors.ts` — replace palette with teal+saffron
- `app/(tabs)/index.tsx` — add hero banner carousel, featured shops, live order tile
- `app/(tabs)/orders.tsx` — add reorder button
- `src/components/PriceText.tsx` — extend for dual-currency
- `src/components/HeroBanner.tsx`, `FeaturedShopsCarousel.tsx`, `LiveOrderTile.tsx`, `DeliveryTimeChip.tsx`, `TrustBadges.tsx` — new
- 3 animation additions in existing tab/cart components

### Storefront (`backend/apps/storefront/`)
- Brand customization (logo, colors)
- Hero on landing page

### Vendor portal (`backend/apps/vendor/`)
- Brand customization
- Dashboard polish for walkthrough

### Deploy (`deploy/` + `.github/workflows/`)
- `docker-compose.prod.yml` — extend with storefront + vendor portal containers
- `Caddyfile` — extend for 3 subpaths
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
