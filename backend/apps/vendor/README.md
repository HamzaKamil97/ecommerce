# Vendor Portal

Next.js 15 app for shop owners (tenants) to manage their own products, orders, and analytics. Scoped — each vendor only sees their own data.

Runs on **port 9100** (`npm run dev`).

## What's here

- `app/page.tsx` — login (stub: paste a user id, sets cookie)
- `app/dashboard/page.tsx` — overview (orders count, revenue, AOV, vertical template)
- `app/products/page.tsx` — list own products + submit-for-review + delete
- `app/products/new/page.tsx` — create product, dynamically renders the vertical template's fields
- `app/orders/page.tsx` — list own orders
- `lib/api.ts` — typed Medusa vendor API client (sends `x-vendor-user-id` cookie as header)

## Run

```powershell
cd D:\Personal\08_Ecommerce app\ecommerce-mvp\backend\apps\vendor
npm install        # only first time
npm run dev
# Open http://localhost:9100
```

## Login (stub)

For now there's no JWT — paste any Medusa user id that has a `Vendor` row in the database. See `docs/TESTING_GUIDE.md` section 4 to set one up.

## TODO before production

- Real auth: JWT login form → call Medusa's `POST /auth/user/emailpass` → store token in HTTP-only cookie → backend middleware reads it
- Image upload to S3-compatible storage (currently expects thumbnail URLs)
- Better vertical-field rendering (date pickers, tag inputs)
- Bulk product import (CSV)
- Brand/branding settings page (logo, colors, banner)
- Delivery zones + windows editor
- Promotions/discounts editor
- Wallet payout requests
