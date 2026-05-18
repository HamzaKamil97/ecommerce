# Codebase Guide

Where every piece of the project lives + what it does.

## Top-level

```
D:\Personal\08_Ecommerce app\
  ecommerce_mvp_pack\          your ORIGINAL spec (never touched)
  ecommerce-mvp\               the working project
    backend\                   Medusa v2 monorepo (Turborepo)
    mobile\                    React Native + Expo (iOS + Android)
    deploy\                    Production deploy artifacts (Docker, Caddy, deploy script)
    local-pg-data\             portable Postgres data dir (port 5433)
    local-pg.log               Postgres log file
    docs\                      All documentation (this folder)
    .gitignore                 git ignore rules
    docker-compose.yml         local Docker stack (optional alt to portable Postgres)
    README.md                  top-level readme
```

## Backend (Medusa v2)

```
backend/                       Turborepo workspace root
  apps/
    backend/                   Medusa server itself
      src/
        admin/                 Medusa admin UI extensions (i18n etc.)
        api/                   HTTP routes
          admin/               super-admin routes (require admin auth)
            approvals/         approve/reject products, list pending
            tenants/           CRUD tenants (shops)
            ai/                AI: describe, categorize
            pos/               POS integration ops
            verticals/         per-vertical templates list
          store/               public storefront API
            search/            semantic search
            tenants/[slug]/    public tenant lookup
            verticals/         public template list (mobile reads this)
            reviews/{products,shops}/[id]/ list+create reviews
            addresses/         customer address book
            wallet/            balance + transactions
            wallet/topup/      top-up wallet
            loyalty/           points + tier + referral code
            loyalty/refer/     apply a referral code
            notifications/     in-app inbox
            notifications/push-token/  register/unregister push tokens
            notifications/[id]/read/   mark notification read
            delivery/slots/    available delivery slots
            delivery/check-address/    is address deliverable?
          vendor/              VENDOR routes (require vendor scope)
            me/                vendor's profile + tenant + vertical
            products/          vendor's own products CRUD
            products/[id]/submit/   submit for reviewer approval
            orders/            vendor's own orders
        jobs/                  Scheduled jobs
          pos-inventory-sync.ts            every 15 min
          release-expired-delivery-holds.ts every 5 min
        links/                 Module links (none yet)
        migration-scripts/     One-time data seeds (initial Medusa data)
        modules/               Custom modules (11)
          pos/                 POS sync with external systems
          approval/            Product moderation workflow
          tenant/              Shops + vendor users
          ai/                  Search/desc/categorize
          vertical-fields/     Per-vertical custom fields + templates
          delivery/            Zones + windows + slot reservation
          notification/        Push, in-app inbox, email/SMS stubs
          reviews/             Product + shop reviews + ratings
          addresses/           Customer saved addresses
          wallet/              Customer wallet ledger
          loyalty/             Points, tiers, referrals
        scripts/
          seed-multi-category.ts   seeds 5 verticals × 10 products
        subscribers/           Event handlers
          pos-order-export.ts           on order.placed → push to POS
          approval-on-product-created.ts on product.created → create approval row
          ai-index-on-product-change.ts  on product.created/updated → embed for search
          notify-on-order-events.ts      on order events → push notification
          loyalty-on-order-placed.ts     on order.placed → award points, fulfill referrals
        workflows/             (none yet — for complex business workflows)
      medusa-config.ts         module registry + http/cors/db config
      .env                     local dev secrets (DATABASE_URL etc.)
      package.json             scripts: dev, build, seed, ...
      tsconfig.json
    storefront/                Next.js customer web (medusajs starter)
      src/                     pages, components, lib
      .env.local               public/private keys for storefront
      package.json
  package.json                 monorepo root (turbo)
  turbo.json
```

## Mobile (React Native + Expo)

```
mobile/                         iOS + Android shopper app (one codebase)
  app/                          File-based routing (expo-router)
    _layout.tsx                 Root layout: auth + cart init, onboarding gate
    onboarding.tsx              First-launch onboarding screen
    (tabs)/                     Bottom tabs
      _layout.tsx               Tab config: Shop / Cart / Orders / Profile
      index.tsx                 HOME: hero, search, category chips, product grid, skeleton loaders
      cart.tsx                  Cart with quantity controls
      orders.tsx                Order history
      profile.tsx               Profile: login/logout, account info
    auth/
      _layout.tsx
      login.tsx                 Email/password login + Google/Facebook placeholders
      register.tsx              Email/password register
    products/
      [id].tsx                  Product details with sticky Add-to-cart
    checkout.tsx                Checkout (TODO: shipping form + payment method)
    order-success.tsx           Post-order confirmation
  src/
    api/                        Backend HTTP client
      medusaClient.ts           axios instance w/ auth interceptor
      products.ts               list, get product
      categories.ts             list + emoji map
      cart.ts                   create/get cart, add/update/remove line items
      auth.ts                   register/login/logout/me/listOrders
    components/                 Reusable UI
      AppButton.tsx             primary/secondary button
      ProductCard.tsx           card with image + price + quick-add button
      PriceText.tsx             formatted currency
      EmptyState.tsx            empty placeholder
      CategoryChip.tsx          horizontal chip with emoji
      Skeleton.tsx              animated skeleton loaders
    store/                      Zustand stores
      authStore.ts              customer auth state
      cartStore.ts              cart state with AsyncStorage persistence
    theme/                      Design tokens
      colors.ts                 light + dark palettes
      spacing.ts                4/8/12/16/24/32 + radii
      typography.ts             title/heading/body/caption/button
      useTheme.ts               hook combining all
    types/                      TypeScript types
      product.ts
      cart.ts
  assets/                       images (icon, splash, favicon)
  app.json                      Expo config (name, icon, splash, scheme)
  package.json                  Expo SDK 54, React 19, RN 0.81
  tsconfig.json                 paths alias: @/* → ./*
  .env                          EXPO_PUBLIC_MEDUSA_BACKEND_URL, _API_KEY
```

## Deploy

```
deploy/                         Production stack for VPS
  docker-compose.prod.yml       Postgres 16 + Redis + Medusa + Caddy
  Dockerfile.medusa             Multi-stage Node 20 build of the Medusa server
  Caddyfile                     Auto-HTTPS reverse proxy
  .env.prod.example             Template — real .env.prod is git-ignored
  deploy.sh                     Run on VPS to build + start stack
  deploy-from-laptop.ps1        Run on laptop to sync + deploy + wire envs
```

## Docs

```
docs/
  README/overview/morning-summary.md   Status of work + how-to-resume
  next-session.md                      Active TODO across sessions
  CODEBASE_GUIDE.md                    This file
  TESTING_GUIDE.md                     How to test every scenario
  INSTALLATION_GUIDE.md                Install Android/iOS app, find packages
  OPTIMIZATIONS_AND_QUESTIONS.md       My suggestions + open questions for you
  instashop-style-architecture.md      Multi-tenant super-app architecture
  multi-tenant-architecture.md         Hybrid pattern doc (older, complementary)
  ai-features.md                       AI roadmap with Phase A picks + cost model
  approval-design.md                   Product approval workflow design
  pos-integration.md                   POS module integration model
  deploy-steps.md                      Manual deploy step-by-step
  deploy-via-docker-api.md             Deploy via Hostinger Docker API (no SSH)
  credentials.md                       All secrets (GIT-IGNORED)
```

## Quick file map by feature

| If you want to … | Edit / look at |
|---|---|
| Change mobile home screen | `mobile/app/(tabs)/index.tsx` |
| Add a mobile screen | `mobile/app/<route>.tsx` (expo-router auto-routes) |
| Wire a new API endpoint | `backend/apps/backend/src/api/{admin,store,vendor}/<path>/route.ts` |
| Add a new custom module | `backend/apps/backend/src/modules/<name>/` + register in `medusa-config.ts` |
| Add a new vertical (e.g. "books") | edit `src/modules/vertical-fields/templates.ts` |
| Tune AI prompts | `src/modules/ai/service.ts` |
| Change theme colors | `mobile/src/theme/colors.ts` |
| Change product card | `mobile/src/components/ProductCard.tsx` |
| Add seed data | `src/scripts/seed-multi-category.ts` or new script |

## Where things run

| Service | Port | Process | How to start |
|---|---|---|---|
| Postgres | 5433 | pg_ctl (no service) | `pg_ctl start -D local-pg-data` |
| Medusa backend | 9000 | node | `cd backend/apps/backend && npm run dev` |
| Next.js storefront | 8000 | node | `cd backend/apps/storefront && npm run dev` |
| Mobile app | metro 8081 | expo CLI | `cd mobile && npx expo start` |
