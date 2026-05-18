# Optimizations & Open Questions

What I'd improve next + decisions only **you** can make.

## 🟢 Optimizations I'd ship next (no decisions required from you)

### Backend
1. **Real auth middleware for `/vendor/*` routes** — currently uses `x-vendor-user-id` header. Replace with JWT middleware that reads `req.auth_context.actor_id`. ~2h.
2. **pgvector** — current semantic search stores embeddings as JSON + does cosine in Node. Install `CREATE EXTENSION vector` + convert `embedding` column to `vector(1536)` + use `<->` operator with an HNSW index. 100× faster at scale. ~3h.
3. **Module link from Tenant → SalesChannel** — when a Tenant is created, auto-create a Medusa SalesChannel and write its id back to `tenant.sales_channel_id`. Eliminates manual wiring. ~2h.
4. **Workflow for vendor product creation** — wrap `POST /vendor/products` in a Medusa Workflow with compensation steps (rollback product + vertical_fields if approval fails). Cleaner failure handling. ~3h.
5. **Vendor onboarding email/SMS** — when a tenant + vendor row are created, send a welcome email with a one-time password reset link. Hook into the Notification module. ~2h.
6. **Idempotency keys on POS sync** — POS adapter currently treats each sync as fire-and-forget. Add an idempotency key (`medusa_order_id`) so retries don't double-push. ~1h.
7. **Cache `getRegionMap` in storefront middleware** — currently re-fetches every 1h, but the first request after a cold start is slow. Add an in-memory module that pre-warms on boot. ~1h.
8. **Sentry / OpenTelemetry instrumentation** — add error tracking + traces to the backend. ~3h.

### Mobile
9. **Bottom-sheet checkout** — currently a separate screen. A bottom sheet feels more InstaShop-like. ~2h.
10. **Pull-to-refresh on Orders + Wallet + Loyalty screens** — currently only on Shop. ~30min.
11. **Skeleton loaders on shop detail** (TODO) — same pattern as ProductCardSkeleton. ~30min.
12. **Offline cart persistence** — cart store already uses AsyncStorage, but doesn't reconcile with backend on reconnect. Add a sync action on app foreground. ~2h.
13. **Image caching** — switch from `<Image>` to `expo-image` with cache policy. Faster scroll. ~1h.
14. **Haptics on add-to-cart** — there's a `HapticTab` already. Add `Haptics.impactAsync` on cart actions. ~30min.

### Storefront
15. **Custom landing page** — current home is the medusajs starter. Replace with a hero + category grid + per-tenant rail (InstaShop-style). ~4h.
16. **Per-tenant subdomain routing** — `acme-flowers.yourdomain.com` → tenant-scoped storefront. Add a middleware that reads the host and sets `tenant_id` in all API calls. ~3h.
17. **Real React 19 type fixes** — current TS errors are warnings only. Update `@types/react` and `@types/react-dom` if Medusa starter's lock allows. ~1h.

### Deploy
18. **GitHub repo + Actions CI** — push backend to GitHub, GitHub Actions builds + pushes Docker image to ghcr.io on every commit. Hostinger Docker API pulls it. ~4h once.
19. **Production env separation** — currently `.env.prod` is in the repo (git-ignored). Move to a real secrets manager (Hostinger has secrets in the panel, or use Doppler/1Password). ~2h.

### AI
20. **Wire real Anthropic API** — set `ANTHROPIC_API_KEY` env var → AI description + categorization use Claude instead of stubs. ~5min.
21. **Vision moderation** — extend the AI module with a `moderate(image_urls)` method that calls Claude Sonnet vision to flag NSFW/copyright issues. Wire into the approval subscriber so flagged products get queued for reviewer attention. ~3h.
22. **Customer support chatbot** — RAG over the catalog + shop policies. New Medusa endpoint `/store/chat` that takes a message + customer_id, returns assistant reply. Use Claude with prompt caching for the policy doc. ~4h.

## 🟡 P0 — features still missing (need building)

23. **Vendor portal Next.js app** (`apps/vendor/`) — login, product CRUD UI driven by `vertical_template`, order list, brand settings. Backend API is ready. ~2 days.
24. **Reviewer dashboard** — admin extension showing `pending_review` queue with thumbs up/down + reject reason. ~1 day.
25. **Mobile Shops tab** + shop detail screen — list of tenants, tap → tenant-scoped product list. ~1 day.
26. **Per-vertical product detail UI on mobile** — food shows prep time + modifiers; flowers show delivery date picker. Read `vertical_template` + render conditionally. ~2 days.
27. **Real-time order tracking** — websockets or polling for order status. Add map view for delivery. ~3 days.
28. **Driver app skeleton** — separate Expo app for delivery drivers. ~1 week (full).
29. **Live commerce module** — RTMP stream URL on each shop, mobile player + "shop the stream" buy button. Pure InstaShop differentiator. ~2 weeks.

## 🔴 Decisions only YOU can make

Pick when you next sit down — these set direction.

### 1. Payment provider (per region)
For MVP, "manual" (cash on delivery) works. For real payments you must pick:
- **Stripe** — global, easiest. Stripe Connect for marketplace splits.
- **Tap Payments** — GCC region (UAE, Saudi). Good for MENA-focused.
- **HyperPay / PayTabs** — MENA alternatives.
- **MyFatoorah** — Kuwait, GCC.
- **iyzico** — Turkey.
Which region do you primarily target? Pick one to start.

### 2. Delivery model
- **Aggregator** (no own drivers) — partner with Talabat/Careem delivery API, or rely on each tenant's own drivers.
- **In-house** — build our own driver app, dispatch system, ratings, payouts.
What stage are you starting at?

### 3. Commission model
For tenants:
- **% per order** (Talabat ~25-30% for food, lower for grocery)
- **Flat monthly subscription** (Shopify-style)
- **Hybrid**
What's the deal you offer shops?

### 4. Geographic launch scope
- One country/city to start?
- Currency (USD/AED/SAR/EUR)?
- Languages required (EN/AR is most common for MENA)?

### 5. Brand identity
- Platform name? (Currently placeholder — "Default Store")
- Logo, primary color, secondary color
- Domain (we're using `srv1162617.hstgr.cloud` — get a real domain)

### 6. Vendor onboarding source
- **Self-signup** with admin approval? (Etsy style)
- **Sales team manually onboards** each shop? (InstaShop early days)
- **Both**?

### 7. Featured / promoted vendors
- Will you charge tenants for top placement?
- Algorithmic ranking only?
- Hybrid (paid + algo)?

### 8. AI provider commitment
- Anthropic Claude (recommended — best vision, prompt caching)
- OpenAI
- Self-hosted Llama
- Multi-provider via OpenRouter?
Match this with your monthly AI budget — Phase A is ~$25/mo, scales linearly with traffic.

### 9. Tenant pricing tiers (if you go SaaS)
- Free marketplace tier — list on the super-app, pay commission per order
- Pro — own white-label app + domain, lower commission
- Enterprise — custom integrations, dedicated support
Define what each unlocks.

### 10. What about subscriptions?
Some verticals benefit:
- Grocery: weekly auto-delivery (Amazon Subscribe & Save)
- Pharmacy: monthly prescription refills
- Flowers: monthly bouquet delivery
Should we build subscription support in MVP or later?

### 11. Multi-language scope
- Just English now?
- English + Arabic at launch (MENA)?
- Per-tenant language (each shop picks its languages)?

### 12. KYC for vendors
- Manual document upload + admin review?
- Integrated with a KYC provider (Onfido, Persona)?
- Skip for MVP, add when scale demands?

### 13. Driver acquisition / training
Even if we use 3rd-party delivery initially, eventually you'll want own drivers:
- Recruiting strategy?
- Training app or in-person?
- Pay model (per-delivery, hourly, hybrid)?

## 🎯 If I had 1 week of focused work, this is what I'd ship

1. **Vendor portal Next.js app** (item 23) — biggest leverage; lets you actually onboard shops.
2. **Mobile Shops tab + shop detail + per-vertical detail UI** (items 25-26) — visible InstaShop-feel on mobile.
3. **Real auth middleware + module links** (items 1, 3) — unblocks the rest.
4. **GitHub + CI → ghcr.io → Hostinger Docker API** (item 18) — makes future deploys trivial.
5. **Vision moderation + real Claude wiring** (items 20-21) — differentiator + reduces reviewer load.

That's the order I'd attack — happy to do any of it.
