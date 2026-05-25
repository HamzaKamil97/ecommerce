# Phase H-2 Manual Smoke Checklist

Run in Chrome / Edge on Windows. Native dev mode (no Docker required on this machine).

## Prerequisites

```bash
# Terminal A — backend
cd backend/apps/backend
npm run dev

# Terminal B — PoS
cd backend/apps/pos
cp .env.example .env
npm run dev
```

Open `http://localhost:9200`.

## Seed demo data (one-time)

In a 3rd terminal, with an admin Bearer token (obtain via the bootstrapAdmin pattern or `npx medusa user -e admin@test.com -p supersecret1` to create a user, then POST `/auth/user/emailpass`):

```bash
TOKEN=...your bearer token...

# Create a cashier
curl -X POST http://localhost:9000/admin/pos-terminal/cashiers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"vendor_id":"v_demo_grocer","name":"Demo Cashier","pin":"1234","role":"cashier"}'

# Seed stock for one variant (replace var_demo_1 with an actual variant ID from Medusa)
curl -X POST http://localhost:9000/admin/wms/stock \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"vendor_id":"v_demo_grocer","variant_id":"var_demo_1","qty":10,"type":"restock"}'
```

## Login + scan
- [ ] LoginScreen lists "Demo Cashier"
- [ ] PIN 1234 signs in successfully
- [ ] PIN 9999 shows "Bad PIN — try again"
- [ ] (Skip if no scanner) Type any catalog barcode then Enter — within 500ms a cart line appears
- [ ] Unknown barcode shows the red error banner
- [ ] Subtotal updates instantly when qty +/- pressed (visibly < 100ms)

## Checkout
- [ ] "Charge" opens PaymentScreen
- [ ] Numpad updates the paid field
- [ ] "Charge" disabled when paid < total
- [ ] On success, "Paid · Change: Xk IQD" appears
- [ ] If a printer is paired (WebSerial), receipt prints + drawer kicks
- [ ] If no printer, "Printer offline" banner shows — sale still recorded

## Offline
- [ ] DevTools → Network → Offline
- [ ] Ring a sale to completion. Status bar shows "● offline" and queue ≥ 1
- [ ] Switch Network back to Online. Within 5s the queue drains to 0
- [ ] In the backend DB, verify `pos_sale` row exists and `wms_stock_pool` decremented

## PWA
- [ ] Chrome shows "Install Hanoot PoS" prompt in the address bar
- [ ] Install succeeds; app launches in standalone window
- [ ] DevTools → Application → Service Workers — sw.js shows activated
- [ ] Application → IndexedDB → hanoot-pos — see `catalog`, `sales_pending`, `cashiers`, `config` stores

## Catalog refresh
- [ ] Settings (⚙) → "Refresh catalog" pulls products from backbone
- [ ] Quick buttons can be added from the catalog and ring items on press
- [ ] Theme toggle persists across reloads (visual change deferred to H-3)

## Speed bar (acceptance)
- [ ] First scan after sign-in: <500ms (item visible in cart)
- [ ] Subtotal recalc: visibly instant (also covered by automated `cart.test.ts`)
- [ ] Queue flush from 10 queued sales when going online: <5s

## Concurrency (smoke)
- [ ] Open a 2nd browser tab as the same terminal. Sell the last unit from tab A. Tab B's "Refresh catalog" shows on_hand = 0.

Stop on the first failure and report.

## Known v1 limitations (not bugs)

- Theme toggle persists but doesn't visually swap colors yet (H-3 polish).
- Quick buttons don't auto-refresh after a `Refresh catalog` (must re-open Settings to pick new variants).
- `pos_sale.status = 'sending'` rows can get stuck if the page is killed mid-drain — manual reset via DevTools or app restart (H-3 cleanup adds an "on-mount reset to queued" step).
- Arabic / Kurdish receipt text prints as `?` (CP437 ASCII-only). H-3 i18n owns proper codepage / RTL printing.
- Stuck-`sending` row reset on app start: deferred (could add `db.sales_pending.where('status').equals('sending').modify({ status: 'queued' })` to App.tsx useEffect).
- `/admin/pos-terminal/*` requires a Medusa admin Bearer token — the PoS app currently doesn't authenticate at startup. The dev workaround is to inject the token via DevTools or env. H-3 wires proper auth.
