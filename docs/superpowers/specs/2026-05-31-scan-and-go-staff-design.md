# Scan & Go (staff-first) — Design Spec

**Date:** 2026-05-31
**Phase:** J — in-store Scan & Go cart-builder, **staff-first** (customer/visitor self-scan deferred to a later phase).
**Status:** Mockups approved (`docs/mockups/j-picker/index.html`). NEXT: writing-plans → build.
**Branch:** `phase-j-picker-app` (off `main` @ post-D1/D2 merge `7382f0d`).
**Supersedes:** the earlier fulfilment-picker spec (pivoted after the [[reference-scan-and-go]] research). Research memory: `reference_scan_and_go.md`.

## Overview
A phone-first PWA where a **staff member** scans item barcodes (or searches by name) to build a customer's cart, **live-validated against stock**, then sends it to the cashier via a short code / QR. The cashier pulls the cart by that code, weighs any loose items, takes cash, and stock decrements — reusing the existing POS OrderInbox + WMS loop from D-1/D-2. Rolls out to **staff first** (trusted, logged-in — de-risks onboarding & theft); customer/visitor self-scan is a separate later phase.

## Locked decisions
1. **Scan & Go cart-builder, not a fulfilment picker.** Builds a NEW cart from scratch by scanning/searching — distinct from picking a pre-existing online order.
2. **Staff-first rollout.** Login = staff cashier PIN (reuse `pos_cashier`). Anonymous customer/visitor self-scan is deferred (the research shows it's viable precisely *because* there's no self-pay, but staff-first removes onboarding/theft risk while we prove the mechanics).
3. **Cashier is the money authority.** The phone never collects money. The cashier loads the cart, takes cash, and that's when stock decrements.
4. **Cart = server-side state; the code is an opaque pointer.** The QR/short-code encodes ONLY the cart id/short_code — never items or total. On "send to cashier" the cart **locks** (`OPEN → PENDING_CASHIER`): the builder can't edit it after; editing spawns a new cart and voids the old code. The cashier always re-fetches fresh by id. (This is the tamper-proofing — non-negotiable.)
5. **Stock: validate on scan, decrement at the cashier.** On each scan/search-add, a read-only catalog/stock check refuses unknown or out-of-stock items (never added). A short-lived **soft reservation** may be created on "send" (reuse the H-1 15-min reservation TTL). The **atomic decrement happens when the cashier collects cash** — not on scan (so walking the aisle never locks stock). Race on the last unit resolves at the till.

## App shape
- New PWA at `backend/apps/scan-go` (~port `:9400`). Reuses the POS scaffold: Vite + PWA, `env.ts` `VENDOR_ID` pattern, theme tokens, API client, barcode/`ScanZone`, cashier-PIN login.
- **Carry-forward POS lessons (from day one):** read env via the `env.ts` bare-constant (never `(import.meta as any).env` — defeats Vite replacement → silent `v_test`); `devOptions.enabled:false` for the dev PWA SW (stale-bundle trap); don't let stale `.js` shadow `.tsx`.
- Phone-first: live-total bar on top, camera viewport, single-column cart, big tap targets, RTL/Arabic-ready (show the total in Arabic numerals too).

## Flow (the 7 mockup screens)
1. **Staff login** — PIN (reuse cashier login).
2. **Scan & build** — camera viewport + scan reticle; each scan → live catalog/stock check → item drops into the cart with a "✓ added · in stock" toast; **live running total** (Arabic numerals shown). Qty steppers per line.
3. **Live stock check** — scanning an unknown/out-of-stock item shows a **red "not added · غير متوفر"** toast; cart unchanged. (The differentiator.)
4. **Search by name** — typeahead against the live catalog for no-barcode items; out-of-stock matches greyed; **weight-priced items tagged "weigh at counter."**
5. **Review cart** — adjust quantities; weigh-at-counter lines flagged; subtotal "(+ weighed items)"; "Send to cashier."
6. **Cart locked · code** — cart locks server-side; shows **QR + short code** (e.g. `K7·4Q2`), item/subtotal summary, **expiry countdown · single use · "editing makes a new code."**
7. **Cashier collects (POS side)** — cashier types/scans the code → POS loads the cart (re-checks stock live) → **weighs loose items (enter price)** → "Cash due" → **Collect cash & finish** → WMS decrement, cart → `PAID`.

## Data model
`scan_cart` (server-side state machine):
```
{ id (prefix sc_), short_code (4–6 char, unique-while-active, indexed),
  tenant_id (vendor_id), staff_id, status: OPEN|PENDING_CASHIER|PAID|EXPIRED|VOID,
  created_at, locked_at, expires_at }
scan_cart_line { id, cart_id, variant_id, title, qty, unit_price_minor,
  line_total_minor, weigh_at_counter (bool), priced (bool) }
```
- `short_code` single-use, ~15-min expiry; regenerated (old voided) if the cart is edited after locking.
- The QR encodes `short_code` (or id) only.

## Backend work
- **`scan_cart` module** (MedusaService): create cart, add/remove/update line (only while `OPEN`), lock (`send`: OPEN→PENDING_CASHIER + stamp `locked_at`/`expires_at` + generate `short_code`), get-by-code.
- **Catalog/stock validate (read-only):** `GET /store|/pos catalog validate?barcode=` (and `?q=` name search) → `{ exists, sellable, price_minor, qty_available, weigh_at_counter }`. No writes. Reuses the WMS `getStock` + catalog.
- **Soft reservation on send** (optional v1): reuse `wmsService.createReservation` (15-min TTL) for the cart's lines so stock is held during the walk to the till.
- **Cashier load + collect:** `GET .../scan-carts/by-code/:code` (re-validates stock, returns lines + weigh-at-counter flags); `POST .../scan-carts/:id/collect` (cashier sets prices for weighed lines, takes cash) → **atomic WMS decrement** (reuse the D-2 consume/decrement path) → cart `PAID`. This is a thin addition to the POS OrderInbox/cashier surface — treat a sent scan-cart as another inbound item the cashier finalizes.
- **Expiry job / lazy expiry:** carts past `expires_at` in `PENDING_CASHIER` → `EXPIRED`, release any soft reservations (reuse WMS expiry semantics).
- **Anti-theft:** cashier UI prompts a re-scan of high-value items / weigh of loose items at collect (the human till is the control point — per research, full re-scan is the only reliable audit). No gates/sensors needed.

## Reference apps (from research — see [[reference-scan-and-go]])
Carrefour/MAF "Scan&Go" (UAE — direct MENA precedent: phone cart → QR → pay at manned cashier), Sam's Club Scan & Go, Tesco Scan-as-you-Shop (shelf-edge produce barcodes), Amazon Dash Cart (running total UX). Key research caveats baked into this spec: value is throughput + live total + stock-validation + app on-ramp (NOT skip-the-line); cart must be server-side+locked; the human cashier is the loss control.

## Success criteria
- A staff member logs in, scans items (in-stock items added with a live total; out-of-stock items rejected), adds a no-barcode item via search + a weigh-at-counter item, reviews the cart, and sends to cashier → the cart **locks** and shows a short code/QR.
- The **cashier** loads the cart by code (stock re-validated), prices the weighed item, collects cash → **WMS decrements atomically** and the cart closes. Editing the cart after send invalidates the old code.
- Verified live (Playwright) end-to-end against the running stack, same bar as D-1/D-2.

## Out of scope (this phase)
**Customer/visitor self-scan** (the anonymous-on-own-phone rollout — later phase), in-app self-payment, full offline cart-cache/sync, loyalty/phone capture, on-phone weighing, the online-order fulfilment picker, the Rider app (Phase G).
