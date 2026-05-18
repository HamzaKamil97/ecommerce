# Ecommerce MVP

Medusa v2 (Node/TypeScript) + PostgreSQL backend, React Native Expo mobile shopper app.

Spec: `../ecommerce_mvp_pack/`. Stack rationale, scope, and roadmap live there — this README is just the operating guide.

## Layout

```
ecommerce-mvp/
  backend/                  Medusa v2 backend (created by `npx create-medusa-app`)
  mobile/                   React Native Expo app — iOS + Android shopper
  web/                      Next.js storefront (planned) — for users not installing the app
  docs/                     Architecture notes, future-phase design
  docker-compose.yml        Optional — only if you ever swap to Docker Postgres
  .env.example files        Inside backend/, mobile/, web/
```

## Platform targets

- **iOS + Android (mobile)** — React Native Expo. Dev via Expo Go on phone, prod via EAS Build.
- **Web storefront** — Next.js (`medusajs/nextjs-starter-medusa` template). Same Medusa backend. SEO/SSR-friendly for users who won't install the mobile app.
- All three share the Medusa v2 backend (Store API, auth, cart, orders, products).

## Strategic direction (locked-in)

1. **Multi-category super-app** — food, flowers, vegetables, electronics, fashion, etc., all in one platform. See `docs/multi-tenant-architecture.md`.
2. **Per-tenant white-label option** — individual shops can opt into a dedicated mobile app + custom domain web store. Same backend, different branding. Hybrid model.
3. **AI as a core feature, not a bolt-on** — semantic search, AI product descriptions, auto-categorization, vision moderation for approval. See `docs/ai-features.md`.

## Prerequisites (already verified)

| Tool | Status |
|---|---|
| Node | v25.8.1 — may need Node 20 LTS if Medusa errors out |
| npm | 11.x |
| PostgreSQL 16 | Installed natively on Windows by `winget install PostgreSQL.PostgreSQL.16` |
| git | ✅ |

Default Postgres install puts the service on port 5432, superuser `postgres` (password set during install via EDB installer — by default `postgres` if winget silent install was used; otherwise whatever you set).

## One-time Postgres setup

Open `psql` (Start Menu → SQL Shell, or `psql -U postgres`) and run:

```sql
CREATE USER medusa WITH PASSWORD 'medusa';
CREATE DATABASE medusa_db OWNER medusa;
GRANT ALL PRIVILEGES ON DATABASE medusa_db TO medusa;
```

If `psql` is not on PATH, find it under `C:\Program Files\PostgreSQL\16\bin\`.

## Backend — first run

```powershell
cd backend
# If the folder is empty (create-medusa-app didn't run yet):
npx create-medusa-app@latest . --no-browser --skip-db --no-with-nextjs-storefront

# Copy env template and edit if needed
copy .env.example .env

# Install deps + run migrations + seed
npm install
npx medusa db:migrate
npx medusa seed --seed-file data/seed.json   # if seed exists
npx medusa user -e admin@example.com -p supersecret

# Start backend
npm run dev
```

Admin dashboard: http://localhost:9000/app
Store API: http://localhost:9000/store/products

After login, go to **Settings → Publishable API Keys**, create one, copy it into `mobile/.env` and `backend/.env`.

## Mobile — first run

```powershell
cd mobile
copy .env.example .env
# Edit .env: set EXPO_PUBLIC_MEDUSA_BACKEND_URL to your laptop's LAN IP
# (this scaffold defaulted to 192.168.33.6 — verify with `ipconfig`)
# Paste the publishable API key.

npm install   # already done by scaffold
npx expo start
```

Scan the QR code with **Expo Go** on your phone. Phone and laptop must be on the same Wi-Fi.

## Mobile project structure

```
mobile/
  app/                        File-based routing (expo-router)
    _layout.tsx               Root: wires auth + cart init
    (tabs)/                   Bottom tabs: Shop, Cart, Orders, Profile
    auth/                     Login + Register
    products/[id].tsx         Product details
    checkout.tsx              Checkout (placeholder — needs address/payment wiring)
    order-success.tsx
  src/
    api/                      Medusa Store API client (axios) + per-resource modules
    components/               Reusable UI: ProductCard, AppButton, PriceText, EmptyState
    store/                    Zustand stores: authStore, cartStore
    theme/                    colors / spacing / typography / useTheme
    types/                    Product, Cart types
```

## What's MVP-ready vs. TODO

**Ready:**
- File-based routing, themed UI, dark mode auto
- Product list with search + pull-to-refresh
- Product details, add-to-cart
- Cart with quantity controls, totals from Medusa
- Email/password register + login (Medusa auth)
- Profile + logout
- Orders list (after login)

**TODO (Phase 2+):**
- Checkout: shipping address form, payment method selection (currently calls `completeCart` and expects a manual provider configured)
- Google / Facebook OAuth (placeholder buttons in login)
- Product approval workflow (`approval_status` custom field — see `docs/approval-design.md`)
- Vendor / Reviewer dashboards (Next.js, separate apps under `web-admin-extra/`)
- POS / ERP sync (see `docs/pos-integration.md`)

## Production notes

For Hostinger deployment (backend):
1. Provision Postgres on Hostinger; use that `DATABASE_URL`.
2. Run migrations on first deploy.
3. Set strong `JWT_SECRET` / `COOKIE_SECRET`.
4. Update CORS to include your production storefront origin.
5. Build: `npm run build && npm run start`.

For mobile production:
1. EAS Build: `npx eas build --platform android`.
2. Replace dev backend URL with production HTTPS URL.
