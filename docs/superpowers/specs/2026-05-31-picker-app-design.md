# Picker App (J) — Design Spec

**Date:** 2026-05-31
**Phase:** J (Picker) — completes "Part 1: vendor/offline experience" (POS + Picker).
**Status:** Approved scope (brainstorm). NEXT: frontend-design mockups → approval → writing-plans → build.
**Branch:** `phase-j-picker-app` (off `main` @ post-D1/D2 merge `7382f0d`).

## Overview
A dedicated phone-first PWA that lets shop staff fulfil online orders: pull an accepted order, walk the shop floor confirming each item (aisle-sorted), mark out-of-stock items, and complete the pick so the order is ready for rider handoff. It fills the currently-unused `online_order.status = 'picking'` slot between the cashier's Accept (reserve) and the rider Handoff (decrement).

## Locked decisions (from brainstorm 2026-05-31)
1. **Dedicated phone-first Picker PWA, any-staff.** A new app (not an extension of the cashier register), reusing the POS PWA pattern. Role is "picker," but any staff (incl. the cashier) can log in and pick — in a small shop one person wears both hats. Rationale: picking ergonomics (mobile, walk-the-floor, scan) differ fundamentally from the counter register.
2. **OOS → partial-fulfil + notify.** When an item is out of stock during picking, the picker marks it unavailable; the order proceeds with in-stock items (adapts the partial-accept path), the line's reservation is released, the order total/commission recompute, and the customer is notified the item was removed (not charged). No in-app substitution flow in v1 (that needs the customer app → deferred to Part 3).

## App shape
- New PWA at `backend/apps/picker` (~port `:9400`). Reuses the POS scaffold: Vite + PWA, `env.ts` `VENDOR_ID` pattern, theme tokens, API client, `ScanZone`, cashier-PIN login (`pos_cashier`).
- **Carry-forward lessons from the POS (apply from day one):**
  - Read env via the `env.ts` constant (bare `import.meta.env.VITE_*`), NEVER `(import.meta as any).env` (the cast defeats Vite's static replacement → silent `v_test` fallback).
  - Disable the dev PWA service worker (`devOptions.enabled: false`) — the workbox precache serves stale dev bundles and breaks live verification.
  - Don't let stale compiled `.js` shadow `.tsx` (Vite resolves `.js` first).
- Phone-first layout: single column, large tap targets, thumb-reachable primary actions. Polls the backend like the OrderInbox.

## Lifecycle (where the picker sits)
```
pending → [cashier Accept → reserves all lines]  → accepted
       → [picker opens order]                     → picking
       → [picker confirms each line / marks OOS, persisted]
       → [picker "Complete pick"]                 → ready for handoff (still reserved)
       → [Handoff to rider — Part 2 / existing]   → consume → decrement → delivered
```
**Stock decrement remains at handoff, not at pick.** Picking only physically confirms items; the reserve→consume model from D-2 is unchanged. OOS during picking is the one exception that touches stock (it *releases* the unavailable line's reservation).

## Core flow (MVP)
1. **Pick queue** — orders with status `accepted` (to-pick) and `picking` (resume). Each card: order #, item count, wait-time/urgency badge, customer area. Tap → open (transitions `accepted→picking`).
2. **Aisle-sorted pick-list** — items sorted/grouped by `aisle_hint` for an efficient floor path. Row: name, qty, thumbnail, aisle tag.
3. **Confirm a pick** — tap-to-confirm (primary); scan-to-confirm optional (HID barcode, a matching scan auto-checks the row). Each confirm **persists** to the backend (`markLinePicked`) — fixing the current local-only gap in the cashier pick-list. Live progress (X/Y picked).
4. **OOS mid-pick** — "mark unavailable" on a row → persist `oos`, **release that line's reservation**, recompute `total_minor`/`commission`, flag for customer notification. The picker sees the adjusted running total.
5. **Complete pick** — enabled when every line is picked-or-OOS → order becomes "ready for handoff." (Rider pickup is Part 2; for now this stages the order and the existing Handoff finishes it.)

## Experience features
**MVP (recommended, low-cost/high-value):**
- Aisle-sorted pick path (uses existing `aisle_hint`).
- Scan-to-confirm optional accelerator (reduces mis-picks).
- Wait-time/urgency badge on the queue.
- "Call customer" quick action (`tel:` to `customer_phone`).

**Deferred (revisit later):**
- Substitution flow (Instacart-style) — needs the customer app → lands with Part 3.
- Batch/multi-order picking (one floor-walk, several orders) — high value at volume, complex.
- Full offline pick queue (PWA sync) — MVP uses optimistic UI + retry; full offline later.
- OOS photo proof; voice-note-to-rider.

## Backend work (small, mostly reuse)
- `accepted→picking` transition (open order).
- Persist pick: `POST /pos/online-orders/:id/lines/:lineId/pick` (markLinePicked picked=true).
- Picking-time OOS: `POST /pos/online-orders/:id/lines/:lineId/oos` → mark `oos` + release that line's reservation + recompute total/commission + flag for notify.
- "Complete pick" → ready state (define: reuse `picking` + an all-picked flag, or add a `ready`/`staged` status — decided at plan time, leaning reuse to avoid migration churn).
- Extend the customer status endpoint to surface OOS/adjusted lines ("item unavailable — not charged").
- Queue reuses `GET /pos/online-orders?vendor_id=&status=accepted|picking`.

## Reuse from POS
Vite/PWA scaffold, `env.ts`, theme tokens, `ScanZone`, API client, cashier PIN login. Backend already supports picking: `online_order_line.{picked,oos,aisle_hint}`, `markLinePicked`, and the unused `picking` status.

## Design-first gate (next step)
New UI surface → must go through **frontend-design** for mockups of: pick queue, pick-list (aisle-grouped), confirm/scan interaction, OOS action, complete-pick → user approval BEFORE writing-plans/code. Reference apps: Instacart Shopper, Talabat/InstaShop picker, warehouse/Zebra pick patterns.

## Success criteria
- A picker logs in (PIN), sees the accepted-order queue, opens an order (→ picking), confirms items (persisted, progress shown), marks an OOS item (reservation released, total adjusted, customer notified), completes the pick (→ ready for handoff), and the existing Handoff still consumes/decrements correctly.
- Verified live (Playwright) end-to-end against the running stack, same bar as D-1/D-2.

## Out of scope (this phase)
Rider app (Part 2 / Phase G), substitution flow, batch picking, the customer-app order-tracking rewire (mobile), super-admin tenant onboarding.
