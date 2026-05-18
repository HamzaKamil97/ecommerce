# Master Implementation Plan — Single Source of Truth

This is THE definitive plan. Every feature, every phase, every TODO lives here with a checkbox showing real status. When in doubt about what's done vs not done, **read this file**.

Last updated: 2026-05-18 (session 1)

Legend: ✅ done · 🟡 partial · ❌ not started · 🚫 explicitly deferred

---

## 0. Foundation

| Item | Status | Where |
|---|---|---|
| Project scaffold | ✅ | `D:\Personal\08_Ecommerce app\ecommerce-mvp\` |
| Local Postgres on port 5433 | ✅ | `local-pg-data/` |
| Medusa v2 backend boots | ✅ | `backend/apps/backend/` |
| Next.js storefront boots | ✅ | `backend/apps/storefront/` |
| Vendor portal Next.js (Next 14, Node 25 compatible) | ✅ | `backend/apps/vendor/` |
| React Native Expo mobile boots | ✅ | `mobile/` |
| Git repository | ❌ | needs `git init` + first commit |
| GitHub remote | ❌ | needs user GitHub account |
| Hostinger VPS provisioned | ✅ | id 1162617, Ubuntu+Docker template |
| Hostinger Docker API deploy path | ✅ proof | nginx test container live; full app deploy = pending image push |
| CI/CD (GitHub Actions → ghcr.io → Hostinger Docker API) | ❌ | needs GitHub repo first |

---

## 1. Customer mobile app (React Native + Expo)

### 1.1 Done ✅

- Onboarding screen (one-time, with localStorage gate)
- 5 bottom tabs: Shop / Shops / Cart / Orders / Profile
- Hero greeting with time-based message
- Debounced product search (350ms)
- Horizontal category chips with emojis
- Skeleton loaders during product fetch
- Product cards with quick-add button
- Product detail screen
- **Per-vertical spec block** on product detail (food → prep + allergens, flowers → stems + occasions, electronics → specs table, etc.)
- "Reviews & ratings" link from product detail
- Shops directory grouped by vertical (horizontal rails)
- Shop detail with branded hero banner
- Email/password register + login + logout
- Cart with quantity controls + remove
- Order history
- Profile screen with nicer menu
- **Wallet screen** — balance, top-up, transaction history
- **Loyalty/rewards screen** — points, tier, progress bar, referral code share + apply
- **Notifications inbox** — list, mark as read, unread badge
- **Reviews screen per product** — stats + distribution bars + composer
- **Checkout** with shipping form + payment provider radio picker (5 providers)
- Dark/light theme auto
- i18n EN + AR with 50+ strings + RTL helper
- Splash + onboarding flow
- StarRating reusable component

### 1.2 Animations & polish — 🟡 partial

- ✅ Skeleton loaders animated (opacity pulse)
- ❌ Page transition animations (Reanimated)
- ❌ Add-to-cart bounce / shake
- ❌ Success animation (Lottie or Reanimated checkmark on order)
- ❌ Cart icon badge with animated number tick
- ❌ Tab bar haptic + spring on press (HapticTab partly wired)
- ❌ Hero image parallax on scroll

### 1.3 Still to build ❌

- Image upload for reviews (with thumbnail)
- Address book screen (backend done, UI missing)
- Delivery slot picker in checkout (backend done, UI missing)
- Filter/sort panel on Shop tab (price range, rating, distance)
- Saved/favourite products
- Recent searches / search history
- Product comparison
- Push token registration on login (call `/store/notifications/push-token` after auth)
- Real Stripe Elements integration for card input
- OAuth (Google, Facebook, Apple)
- Forgot password flow
- Profile edit screen
- Order detail screen (currently only list)
- Cancel order from order detail
- Chat with shop / support (use `/store/chat` endpoint we built)
- Push notifications wiring with `expo-notifications` + permissions prompt

### 1.4 Build & distribution

- ✅ Expo Go install instructions documented (`docs/INSTALLATION_GUIDE.md`)
- 🟡 EAS Build config files exist in this commit; user must run `eas login + eas build` once
- ❌ Real installable Android APK (.apk file) — requires EAS Build run
- ❌ iOS install via TestFlight — requires Apple Developer Program ($99/year)
- ❌ Production app store submission

---

## 2. Web storefront (Next.js)

### 2.1 Done ✅

- Medusa starter scaffolded
- `.env.local` wired with publishable key
- Runs on port 8000
- Region routing `/dk` (Denmark default)
- Browse + cart + account flows work via Medusa starter defaults

### 2.2 Still to build ❌

- Custom branding (logo, primary/secondary colors, fonts)
- Custom landing page with hero + featured shops
- Shops directory page (mirror mobile Shops tab)
- Per-vertical product detail UI (web version of `VerticalFieldsBlock`)
- Tenant-scoped subdomain routing (`acme-flowers.yourdomain.com`)
- Customer support chat widget (using `/store/chat`)
- Wallet / Loyalty / Notifications pages
- Live commerce stream player
- AR product preview
- SEO meta tags + structured data

---

## 3. Vendor portal (Next.js)

### 3.1 Done ✅

- Login (stub — paste user id, cookie-based)
- Dashboard with KPI cards (orders, revenue, AOV) + vertical template viewer
- Products list with submit-for-review + delete
- New product form — **dynamically renders fields per vertical** (food vendor sees prep_minutes + spice; flowers vendor sees stem_count + occasions)
- Orders list
- Downgraded to Next.js 14 to be compatible with Node 25 ✅

### 3.2 Still to build ❌

- Real auth (JWT login + middleware) — currently cookie stub
- Brand settings page (logo upload, primary/secondary color picker, banner)
- Delivery zones + windows editor (UI for the existing delivery module)
- Promotions/coupons editor
- Customer chat inbox
- Refund management
- Wallet payout requests
- Order detail view with status transitions
- Bulk product import (CSV upload)
- Vendor analytics chart (sparkline orders/day, top products list)
- Approval audit trail visible to vendor

---

## 4. Admin (Medusa Admin)

### 4.1 Done ✅

- Built-in Medusa admin works at `/app`
- Admin user created (2ngryprogrammer@gmail.com)
- All custom modules have HTTP routes admin can call

### 4.2 Still to build ❌

- **Reviewer dashboard** — Medusa Admin extension for `pending_review` queue
- Tenants management UI (admin → add shop, approve, suspend) — backend done, no UI
- Approvals queue UI
- Per-tenant analytics dashboard
- Platform-wide analytics
- Audit log viewer
- Notification template editor

---

## 5. Backend — Medusa custom modules (13 ✅)

| Module | Status | Tables |
|---|---|---|
| pos | ✅ | sku_mapping, inventory_sync_log, order_export_log |
| approval | ✅ | product_approval, approval_audit |
| tenant | ✅ | tenant, vendor |
| ai | ✅ | product_embedding |
| vertical-fields | ✅ | vertical_product_fields |
| delivery | ✅ | delivery_zone, delivery_window, delivery_slot |
| notification | ✅ | push_token, notification_record |
| reviews | ✅ | product_review, shop_review |
| addresses | ✅ | saved_address |
| wallet | ✅ | wallet, wallet_transaction |
| loyalty | ✅ | loyalty_account, loyalty_event, referral |
| promotions | ✅ | promo_code, promo_redemption |
| payments | ✅ | payment_attempt |
| promotions | (counted above) | |

### 5.1 Still to add ❌

- **promotions** (use Medusa's native + extension for per-tenant promo codes)
- **analytics** (precomputed materialized views for fast queries)
- **inventory** (per-tenant per-warehouse stock, with reservations)
- **subscriptions** (recurring orders for grocery/flowers/pharmacy refills)
- **chat** (customer ↔ vendor ↔ driver messages, persisted)
- **kyc** (vendor KYC docs upload + review workflow)
- **disputes** (refund disputes, customer chargebacks)
- **affiliate** (influencer program with tracking codes)
- **audit** (cross-module audit log)

---

## 6. Payment providers — Iraq focus

| Provider | Status | Notes |
|---|---|---|
| Manual (cash on delivery) | ✅ adapter | Works immediately, no credentials |
| ZainCash | ✅ adapter (stub) | Need merchant signup at zaincash.iq + env vars |
| QiCard | ✅ adapter (stub) | Need merchant signup at qi.iq + env vars |
| AsiaPay | ✅ adapter (stub) | Need merchant signup at asiapay.iq + env vars |
| Stripe (Visa/MC international) | ✅ adapter (stub) | Need Stripe account + STRIPE_SECRET_KEY |
| Fatora.io (aggregator) | ❌ | Optional wrapper for ZainCash + QiCard in one API |

All adapter code in `backend/apps/backend/src/modules/payments/adapters/`. Stub mode returns a fake redirect_url when no credentials set, so the full mobile flow can be demoed end-to-end without real merchant accounts.

---

## 7. AI features

| Feature | Status | How it works |
|---|---|---|
| Semantic search | ✅ (stub embeddings) | `/store/search?q=...` — hash-based vectors, keyword fallback. Swap to OpenAI text-embedding-3-small for real perf. |
| AI product description generator | ✅ (Anthropic/OpenAI/stub) | `POST /admin/ai/describe` — pluggable provider via env. |
| Auto-categorization | ✅ (regex rules + Claude-ready) | `POST /admin/ai/categorize` |
| Vision moderation | ❌ | Add to AI module: `moderate(image_urls)` → flag NSFW / counterfeit |
| Customer support chatbot | ✅ (rule + Claude-ready) | `POST /store/chat` |
| Personalized recommendations | ❌ | Collaborative filtering on order history |
| Auto-translation | ❌ | For multi-language product listings |
| Dynamic pricing hints | ❌ | For vendors |
| Demand forecasting | ❌ | Time-series on order data |
| Fraud detection | ❌ | Score suspicious orders |

To activate real AI providers: set `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` in `backend/apps/backend/.env` and restart Medusa.

---

## 8. Multi-tenancy + Multi-vertical

| Item | Status |
|---|---|
| Tenant entity + module | ✅ |
| Vendor entity + module | ✅ |
| Public tenant lookup (`/store/tenants`) | ✅ |
| Sales-channel-per-tenant scoping | ✅ (vendor API filters by sales channel) |
| Vertical templates (10 verticals) | ✅ |
| Vertical fields on products | ✅ |
| Mobile renders per-vertical detail | ✅ |
| Vendor portal product form is vertical-aware | ✅ |
| Per-tenant white-label config (logo, colors, domain) | 🟡 schema done, UI missing |
| Per-tenant subdomain routing in storefront | ❌ |
| Per-tenant Stripe Connect (commission splits) | ❌ |
| Tenant approval workflow | 🟡 status field exists, no UI |

---

## 9. Documentation (16 docs ✅)

- ✅ `README.md`
- ✅ `MASTER_PLAN.md` (this file)
- ✅ `docs/morning-summary.md` — what's running, how to test, restart commands
- ✅ `docs/CODEBASE_GUIDE.md` — where every file lives
- ✅ `docs/TESTING_GUIDE.md` — every test scenario with cURL
- ✅ `docs/INSTALLATION_GUIDE.md` — install Android/iOS, find packages
- ✅ `docs/OPTIMIZATIONS_AND_QUESTIONS.md` — improvements + 13 questions for you
- ✅ `docs/instashop-style-architecture.md` — super-app architecture
- ✅ `docs/multi-tenant-architecture.md` — hybrid marketplace pattern
- ✅ `docs/ai-features.md` — AI roadmap + cost model
- ✅ `docs/approval-design.md` — moderation workflow
- ✅ `docs/pos-integration.md` — POS sync model
- ✅ `docs/payment-providers.md` — Iraq market plan + 4 adapter docs
- ✅ `docs/deploy-steps.md` — manual deploy walkthrough
- ✅ `docs/deploy-via-docker-api.md` — no-SSH deploy path
- ✅ `docs/next-session.md` — running TODO
- ✅ `docs/credentials.md` — secrets (git-ignored)

---

## 10. Open decisions (only YOU can make)

These shape the next phases — capture answers in `docs/OPTIMIZATIONS_AND_QUESTIONS.md`:

1. **Geographic launch** — Iraq first? Which city?
2. **Commission model** — % per order, flat monthly, or hybrid?
3. **Delivery model** — own drivers, aggregator (Talabat/Careem), or hybrid?
4. **Brand identity** — name, logo, colors
5. **Domain** — get one (or use Hostinger's reverse-DNS for now)
6. **Vendor onboarding** — self-signup or sales-team-driven?
7. **Featured vendor placement** — paid? algorithmic?
8. **AI provider commitment** — Anthropic, OpenAI, both?
9. **Subscription model in MVP** — yes/no/later?
10. **Multi-language scope** — EN only? EN+AR? per-tenant?
11. **KYC for vendors** — manual? KYC provider?
12. **App store identity** — same brand for all tenants, or per-tenant white-label apps?

---

## 11. Phased delivery roadmap

### Phase 1 — MVP shopper app (current state) ✅
Working ecommerce flow: browse, cart, checkout (manual), profile, multi-vertical.

### Phase 2 — Vendor onboarding (next)
- Real vendor JWT auth
- Vendor portal: branding settings, delivery zones, promotions
- Admin tenant approval UI
- Reviewer dashboard

### Phase 3 — Payment + delivery integrations
- Real ZainCash + QiCard live credentials
- Stripe Connect for marketplace
- Delivery slot picker in mobile checkout
- Push notifications wired end-to-end

### Phase 4 — Polish + animations + storefront branding
- Lottie/Reanimated animations
- Custom branded storefront
- Per-tenant subdomain routing
- Reviewer dashboard

### Phase 5 — AI production
- Real Claude/OpenAI API keys set
- pgvector for semantic search at scale
- Vision moderation in approval flow
- Personalized recommendations

### Phase 6 — Production launch
- Real domain + HTTPS via Caddy
- GitHub repo + CI/CD pipeline
- Hostinger Docker API deploy
- Monitoring (Sentry / OpenTelemetry)
- App Store + Play Store submission

### Phase 7 — Growth features
- Driver app
- Live commerce streams
- Subscriptions
- Loyalty challenges + gamification
- Referral leaderboard

---

## 12. How to know if anything is broken

Run this from the project root:

```powershell
# Stack health
curl http://localhost:9000/health     # → OK
curl http://localhost:8000/dk -I      # → HTTP 307 (cookie redirect)
curl http://localhost:9100/ -I        # → HTTP 200 (vendor portal)

# Custom endpoints
$K = "pk_93955e55e64a552747b4e823efaf62b16d9af5016112d81ab42fde45add5862d"
curl -H "x-publishable-api-key: $K" "http://localhost:9000/store/payments/providers?currency=IQD"
curl -H "x-publishable-api-key: $K" "http://localhost:9000/store/verticals"
curl -H "x-publishable-api-key: $K" "http://localhost:9000/store/loyalty?customer_id=demo"
```

If any return non-200, see `docs/TESTING_GUIDE.md` for the debugging playbook.

---

This is the **single source of truth**. Edit checkboxes here as work is completed.
