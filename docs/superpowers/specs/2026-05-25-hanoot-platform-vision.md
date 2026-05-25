# Hanoot Platform — Master Vision Document

**Status:** Approved through brainstorming session 2026-05-25. This is the canonical source of truth for *what we're building, why, in what order, and what we're explicitly not building*. All subsequent implementation plans descend from this document.

**Replaces:**
- `2026-05-20-phase-a0-customer-ui-audit.md` (subsumed — was customer-app-only)
- `2026-05-20-phase-a-reskin-plan.md` (subsumed — was A-Re scope-only)
- Memory `project-phase-plan-2026-05-20.md` (refined here — extends to 6-client platform)

---

## 1. Strategy

**What Hanoot is:** A multi-vertical retail operating system for Iraq. Not a delivery app, not a PoS company — a **platform** with multiple clients sharing one data spine.

**The strategic insight that ties it together:**

> Free, polished PoS + Inventory is the customer-acquisition lever. Iraqi grocers use cash registers or paper. The friction of switching is enormous *unless someone gives them something materially better for free*. Once they switch, their inventory lives in our spine — and that inventory automatically becomes the catalog Hanoot customers order from. **One data entry, everywhere.**

**Why this works in Iraq specifically:**
- Iraqi retail is fragmented (every neighborhood has 3 shops; no Carrefour dominance)
- No incumbent multi-vertical SaaS for retail
- Cash-economy mostly; demand for digitization is real but no one's providing it well
- Mobile penetration is high; broadband is patchy → **offline-first is non-negotiable**
- Talabat owns restaurant delivery but doesn't touch grocery PoS or other verticals — clean entry lane

**The flywheel:**
```
Free PoS attracts grocers ─→ grocers' inventory becomes Hanoot catalog ─→
catalog attracts customers ─→ customer orders pay grocers ─→ grocers stay sticky
                  ↑                                                       │
                  └───────────── revenue funds next vertical ←────────────┘
```

**What we are NOT building:**
- A clone of Talabat (we're not restaurant-first)
- A consumer-only app (the moat is the supply side)
- A pure PoS company (without the demand side, we're another Loyverse)
- A regional/global platform (Iraq-first; expansion is a separate conversation)

**Strategic risks (must be actively managed):**
1. PoS quality bar — if it's worse than a $200/mo Loyverse, free isn't enough
2. Onboarding labor — grocers won't self-onboard 5,000 SKUs; need AI-assisted data entry + concierge onboarding for first ~20 shops
3. Vendor lock-in concerns — must offer open data export to keep "free" trust
4. Geographic concentration v1 — Baghdad first; Erbil follows in v2

### Reference apps studied
- **Loyverse** (PoS for small retailers) — gold standard for clean UI consistent across mobile / PC / dashboard. **Hanoot's PoS must match Loyverse on UX quality and beat it on integration depth** (free, AI-assisted, integrated with customer demand via Hanoot app).
- **Square** (PoS + payments) — best-in-class hardware integration patterns
- **Talabat groceries** (Iraq's incumbent in food delivery) — studied for failure modes (Section 6)
- **Webvan / Kozmo / Instacart early years** — studied for grocery-delivery failure modes
---

## 2. Architecture — 6 clients + 1 backbone

```
        ┌──────────────────────────────────────────────────┐
        │              HANOOT BACKBONE                      │
        │   Single source of truth: stock, catalog,         │
        │   orders, reservations, identity, geo             │
        │   + Warehouse Management Service (the key bit)    │
        └──────────────────────────────────────────────────┘
            ▲       ▲       ▲       ▲       ▲       ▲
            │       │       │       │       │       │
       Customer  PoS+Inv  Vendor  Picker  Rider  Super-admin
       super-app          Admin   (PWA +  (mobile)   (web,
       (Expo)    (web,   (web+    Android only)      v2)
                 Win+    phone,    later)
                 tablet  dashboard
                 +phone) +phone)
```

### Form-factor priority per user (critical refinement)

Different users prefer different devices. Build for the device they actually grab:

| User | Primary device | Secondary | Note |
|---|---|---|---|
| Cashier (daily counter work) | **Windows POS terminal** | Android tablet | Touch screen, full keyboard for ringing, barcode scanner, receipt printer attached. PWA in Chrome / Edge. |
| Data-entry / catalog manager | **Mobile phone** | Tablet, then desktop | Walks the aisles with phone, scans barcodes, takes photos, fills schema-driven fields. PoS web app responsive down to phone. |
| Vendor owner (reports / settings) | Phone + desktop | Tablet | Quick check on phone, deep dives on desktop |
| Picker | **Android phone** (PWA acceptable v1) | iOS later | One-handed, aisle-mobile, barcode-scan via phone camera |
| Rider | **Android phone** | iOS later | GPS, navigation, single-task UI |

**Key implication:** PoS + Inventory + Vendor Admin **all share the same responsive React+Vite codebase**, optimized for three breakpoints (phone / tablet / desktop). One UI codebase, three form factors, role-based views inside.

### Role-based privilege model (mandatory for easy expansion)

The platform must support arbitrary role combinations from day 1. Roles aren't hardcoded — they're a permissions matrix configured per vendor. Expected v1 roles:

- **Owner** — full access to everything in their vendor scope
- **Cashier** — register only, no catalog edits, no reports
- **Data-entry staff** — catalog edits, no register, no reports
- **Picker** — pick lists only, no register, no catalog
- **Manager** — reports + catalog, no register

**Future-ready** (built but unused in v1): preparation-window roles, multi-queue cashier (lane 1 / lane 2 / lane 3 with shared but trackable stock), kitchen-display role (when restaurant vertical ships). Adding a new role later = configuration, not code.
### Client roster

| # | Client | Platform | Primary user | Status |
|---|---|---|---|---|
| 1 | **Customer super-app (Hanoot)** | iOS + Android (Expo) | end customer | Shipped through Phase A-Re |
| 2 | **Hanoot PoS + Inventory** | Web (PWA) — Windows + Android tablet | cashier (daily), vendor (data entry) | v1 build |
| 3 | **Vendor Admin** | Web + mobile-responsive, also inside PoS as PIN-gated mode | vendor owner/manager (weekly) | v1 build |
| 4 | **Hanoot Picker** | PWA v1 (reuse the PoS-Vite codebase, phone-optimized view) → native Android in v2 → iOS later | warehouse picker walking aisles | v1 build |
| 5 | **Hanoot Rider** | Android + iOS (Expo) | courier | v1 build | 
| 6 | **Super-admin console** | Web only, internal | Hanoot ops | v2 (deferred) |

### Backbone design principles

- **Single source of truth for stock.** Every channel (PoS sale, Hanoot order, vendor manual edit, picker confirm) hits the same atomic stock pool.
- **Offline-first for PoS.** Local IndexedDB → background sync queue (Web Worker, never blocks UI) → conflict resolution policy: last-writer-wins for product edits, optimistic-lock (CAS) for stock decrements.
- **Vendor-scoped multi-tenancy.** Shop A can't see Shop B's catalog/sales/customers. Enforced at API.
- **Geographic logic at the backbone.** Customer sees only shops within delivery radius — backbone computes, client renders.
- **Identity model:** customer / vendor-staff / vendor-owner / picker / rider / super-admin. Token-based auth. Vendor staff inherit vendor scope.
- **AI surfaces** (Najma chat / vision) = client-side OpenAI today, move to backbone proxy in Phase D3 for rate limits + key safety + per-vendor budgets.
- **Long offline tolerance** — PoS survives 7+ days offline; vendor can power-off-and-return without data loss.

### Microservices-ready modular monolith

Modules within the Medusa monolith today, each splittable later:

| Module | Responsibility |
|---|---|
| `catalog/` | Products, variants, categories, prices |
| `wms/` | Stock pools, reservations, decrements, drift detection — **the heart** |
| `orders/` | Customer orders, line items, status machine |
| `users/` | Auth, identity, multi-tenancy |
| `geo/` | Radius, address geocoding, delivery zones |
| `ai/` | Proxy to OpenAI + caching + per-vendor rate limits |
| `payments/` | COD + (later) card / Zain / FastPay |
| `couriers/` | Rider state, assignment, GPS history |
| `reports/` | Vendor-scoped aggregates (sales, revenue, top SKUs) |

**Hard rules that keep splitting trivial:**
1. No cross-module raw-DB joins. Module A queries module B via service interface.
2. Domain events for cross-module flows. `orders.placed` → `wms` listens → reservation created.
3. API versioning from day 1 (`/v1/...`).
4. UI is dumb — never assume internal API shape; only contracts.
5. Tests at module boundaries.

Splitting a module to a microservice later = swap in-process bus for HTTP + Redis events. No data model rewrite. No consumer rewrite.

**Confirmed:** Modular monolith for v1. Microservices when scale demands it (likely after 50+ shops + when one module's load dominates the rest).
---

## 3. Tech stack (locked)

| Layer | Choice |
|---|---|
| Backend framework | Medusa v2 (Node + Postgres) |
| API style | REST per module, versioned `/v1/*` |
| Real-time | WebSocket (Socket.io), dedicated micro-service when traffic warrants |
| Mobile clients | Expo + React Native (Customer / Rider / Picker) |
| PoS + Vendor Admin | React + Vite + PWA (web-first); Electron wrap optional later |
| DB | Postgres + Redis (cache + reservation TTL) |
| Offline storage | Dexie on IndexedDB |
| Event bus | In-process EventEmitter, Redis Pub/Sub adapter when split |
| LLM/vision | Backbone `ai/` proxy → OpenAI gpt-4o-mini (chat + vision) |
| Repo | Workspace monorepo (pnpm + Turborepo when 3+ clients exist) |
| Deploy | Hostinger VPS for v1 → cloud (AWS/Hetzner) when scale demands |

### PoS technical specifics
- **PWA install** for Windows POS terminals (vendor opens `pos.hanoot.iq`, "Install app")
- **WebUSB / WebSerial / WebBluetooth** for hardware: barcode (USB HID — auto), receipt printer (ESC/POS over Serial), cash drawer (relay via printer). **The PoS owns the invoice template** — Hanoot designs the layout (shop logo + items + tax + footer); PoS sends ESC/POS bytes to whatever printer the vendor has. We support a curated list of printer drivers (Epson TM-T20, Bixolon, Star) and a generic ESC/POS fallback. **Invoice template designer** in Vendor Admin lets the vendor adjust footer copy / logo within bounds.
- **IndexedDB + service worker** for offline catalog cache. Budget headroom up to 1GB (was 20MB target) — enough for 100k+ SKUs with thumbnails + 30 days of transaction history. Dexie handles eviction policy.
- **WebSocket** to backbone for real-time stock updates from other terminals
- **Configurable UI** — vendors customize layout, quick-buttons, theme
- **Schema-driven product fields per industry** — grocery (weight, expiry), clothes (size, color), salon (service duration)

### Speed bar (non-negotiable)
- Cashier rings 1 item: **<500ms** (barcode → cart line → done)
- Subtotal recalculates: **<100ms**
- Offline mode same speed (no network round-trip)
- Sync queue flush when online: **<5 seconds**
- Reservation API: **<300ms**
- Hardware ops (barcode read, print receipt) never blocked by background sync

---

## 4. v1 scope cut (months 1–9)

**v1 milestone:** ONE Baghdad grocery shop runs the full Hanoot loop daily. After build completes (~M9), pilot for 4 consecutive weeks. **At least 10 distinct customers each place ≥1 successful order** during that pilot, without OOS cancellation, paid COD, marked delivered.

### v1 includes

| # | Component | Scope |
|---|---|---|
| 1 | Hanoot PoS | Counter ringing, barcode, receipt print, cash drawer, offline 7+ days, single-shop multi-terminal sync |
| 2 | Inventory & catalog data entry | Camera-first barcode scan + auto-populate (GS1/OpenFoodFacts), CSV import, manual add, schema-driven per category |
| 3 | Vendor Admin | Catalog manager, stock manager, basic reports, order inbox (accept/reject Hanoot orders), shop hours, delivery radius — also accessible inside PoS as PIN-gated manager mode |
| 4 | WMS (backbone) | Single stock pool per shop+SKU, reservation lock (15-min TTL), atomic decrement, OOS guard, nightly drift detection |
| 5 | Customer super-app | Wires to real backbone (replace DEMO_*), geo-filter, real reservation flow. Najma chat + vision continue via backbone proxy |
| 6 | Picker app | Pick list, aisle-optimized path, barcode-scan confirm, substitution flow with customer chat, seal bag, handoff |
| 7 | Rider app | Accept job, GPS turn-by-turn, "arrived" + "delivered + photo" markers, geographic radius enforced |
| 8 | Auth + tenancy | Vendor signup → manual approval. Customer email/phone OTP. Rider onboarding manual. Multi-tenant API isolation. |
| 9 | Payment | Cash on Delivery only |
| 10 | Deploy | Hostinger VPS resume. Backbone at `api.hanoot.iq`, PoS at `pos.hanoot.iq`, customer web preview at `hanoot.iq` |

### v1 explicitly excludes (deferred to v2)

- Restaurant vertical (tables, modifiers, kitchen display)
- Other verticals (electronics, clothes, salons, pharmacy, hypermarket-specific features)
- Super-admin console (use DB/SSH for v1)
- Subscription/billing UI for vendors (PoS perpetually free in v1)
- Real-time multi-device shared cart (gated)
- Advanced analytics, forecasting, promotions
- Multi-shop chains
- Card / digital wallet payment
- Loyalty / customer CRM
- Vendor marketing tools (banners, coupon creation)
- Voice / AR features

**Scope philosophy:**
> We will ship one excellent end-to-end loop, not 50 mediocre features.
> If it doesn't make the first shop survive day-by-day, it's not v1.

---

## 5. Phase plan with dependencies

### v1 timeline (months 1-9 from kick-off)

```
M1 ─ M2 ─ M3      M4 ─ M5 ─ M6      M7 ─ M8 ─ M9
═══════════      ═══════════      ═══════════
FOUNDATION        INTEGRATION       FULFILLMENT
PoS-first         Customer meets    Pick → Deliver
                  Backbone          → Go live
```

### Months 1-3 — Foundation

| Phase | What | Depends on |
|---|---|---|
| **H-1 Backbone-WMS** | Stock model, reservation engine with TTL, atomic decrement, multi-tenant scoping, geo radius API, event bus pattern | Existing Medusa modules |
| **H-2 PoS shell** | React+Vite web app, PWA install, IndexedDB cache, service-worker sync queue (background Web Worker), barcode HID, ESC/POS printing via WebSerial, cash-drawer trigger, configurable UI shell | H-1 (API contract) |
| **H-3 Inventory & Vendor Admin** | Camera-first data entry, AI auto-populate (LLM category classifier), CSV import, schema-driven fields per category, PIN-gated manager mode inside PoS, separate web dashboard for reports | H-1 |

**End of M3:** Partner shop's catalog onboarded. Cashiers ring sales offline. Stock flows to backbone.

### Months 4-6 — Integration

| Phase | What | Depends on |
|---|---|---|
| **D-1 Customer ↔ Backbone wire** | Replace DEMO_* with real backbone calls. Geographic filter. | H-1 stock model live |
| **D-2 Order → Reservation flow** | Cart → checkout → reservation (15-min TTL) → vendor PoS shows order inbox. Auto-release on expiry. | H-1, D-1 |
| **D-3 AI proxy** | Move Najma chat + vision behind backbone `ai/` module. Per-vendor rate limits + caching. Key-optional fallback retained as graceful degradation. | Backbone auth |

**End of M6:** Hanoot customer browses partner shop's REAL catalog, places order, vendor sees it in PoS inbox.

### Months 7-9 — Fulfillment

| Phase | What | Depends on |
|---|---|---|
| **J Picker app** | Android phone. Pick list, scan-confirm, substitution flow with AI suggestions + customer chat, seal bag, handoff. Real-time decrement per pick. | H-1, D-2 |
| **G Rider app** | Android phone. Accept job, GPS turn-by-turn, "arrived" + "delivered + photo". Geographic radius enforced. | D-2, J |
| **E Deploy + Onboard** | Hostinger VPS resume. All clients live. Recruit 10 customers. | All above |
| **Go-live ops** | Pilot the partner shop 4 weeks, iterate weekly | All |

**End of M9 — v1 closes:** First shop running daily, 10 customers, full loop validated.

### v2 phases (post-v1, sequence loose)
- Multi-shop expansion (5 → 20 → 100 grocery shops)
- Restaurant vertical (tables, modifiers, kitchen display)
- Other verticals (electronics, clothes, salons, pharmacy)
- Super-admin console (when >10 shops to manage)
- Card / Zain Cash / FastPay integration
- Subscription / billing for vendors (when a paid PoS tier launches)
- Voice ringing for cashiers
- Demand forecasting + restock predictor
- Multi-stop courier optimization
- Loyalty / customer CRM
- Vendor marketing tools

### Critical path
```
H-1 Backbone-WMS  ─→  H-2 PoS shell  ─→  H-3 Data entry
                  ↓                  ↓
                  D-1 Customer wire ──→ D-2 Reservation ──→ J Picker ──→ G Rider ──→ E Deploy
                  ↓
                  D-3 AI proxy (parallel-ok)
```

### Velocity benchmark
1 phase ≈ 3-4 weeks of focused work with subagent army. 9 phases × 3.5 weeks ≈ 32 weeks ≈ 7-8 months. **9-month v1 is realistic with 1-month buffer.**

---

## 6. Risk analysis + AI integration map

### Why grocery e-commerce fails (studied Webvan, Kozmo, Instacart early years, Talabat groceries Iraq today)

| Failure mode | What killed them | Hanoot mitigation |
|---|---|---|
| Out-of-stock at pick time | Customer orders, picker can't find item, churn on 1st bad order | Real-time atomic stock pool. Reservation lock when order placed. OOS guard prevents over-selling. |
| Bad substitutions | "Wanted Lurpak, got generic" → churn | AI substitution from same category + price tier. Picker calls customer mid-pick if unsure. Customer pre-approves substitution mode at checkout. |
| Slow / wrong deliveries | 30-min promise becomes 3 hours; cold chain breaks | Geographic radius enforced at order time (per-shop configurable, default 5km grocery, 15-min ETA target). Realistic ETA from prep time + rider distance. Cold-chain bags + courier training. |
| Wrong address | Iraqi address ambiguity ("block 12, apt 8 near the mosque") | GPS pin + voice note + landmark photo at signup. Rider sees all 3. |
| Mis-priced items | Barcode price A, PoS price B, online price C | **Single price source** — PoS is canonical; customer app reads same DB. No dual entry possible. |
| Vendor doesn't update inventory | System says 10 in stock, shelf has 0 for a week | **PoS-forced inventory** — every walk-in sale decrements stock automatically. Drift detection nightly flags mismatches. |
| Cancellation cascade | Customer cancels mid-pick → wasted labor | 5-min "free cancel" window; after that, contact required. Reservation auto-releases on cancel. |
| Cash handling friction | COD with no change | Customer enters bill amount at checkout. Rider sees expected change. |
| Margins killed by free delivery | Kozmo death | Minimum order (5k IQD grocery). Delivery fee for sub-25k orders. Express +2k. |
| First-bad-order churn | 60%+ churn after 1 bad order | Target: 95% no-OOS / 98% on-time / zero wrong-address. Aggressive "make it right" policy in v1 (refund + apology + bonus). |

### Iraq-specific risks

| Risk | Mitigation |
|---|---|
| Internet patchy in shops | Offline-first PoS, 7+ day local cache, background sync never blocks UI |
| Currency volatility (IQD ↔ USD) | Backbone stores prices in minor units per declared currency; vendor sets IQD; customer sees IQD. USD-priced shown with conversion at customer tap-time. |
| Trust deficit | Free PoS upfront. Refund-on-bad-order policy. First 10 customer testimonials, fast. |
| Address ambiguity | Geo pin + voice note + landmark photo at signup. |
| Cash-only assumption | COD primary v1, but payments module ready for card/Zain/FastPay add-in v2. |
| Vendor distrust of "free" | Open CSV data export at any time. Stated in plain language at signup. |

### AI integration map

**Data entry (vendor productivity):**
- Barcode → auto-fill from open catalog (GS1/OpenFoodFacts) + LLM category classifier
- Photo → AI extracts name/brand/category, auto-crop, background removal
- Voice catalog entry (LLM transcribes + parses to structured product fields)
- Bulk catalog cleanup (normalize inconsistent names)
- Auto-generate product descriptions

**PoS (cashier productivity):**
- **Audio feedback ringing** — beep on successful scan, distinct error tone on unknown barcode, success chime on payment. No item-name pronunciation (slows cashier, annoys customers).
- **Inventory alerts** — notification feed for: items expiring soon (configurable threshold per category — milk 7 days, packaged goods 30 days), items running low (sales velocity → predicted stockout date), items depleted, items receiving abnormal sales pattern (anomaly), items with no movement in N weeks (slow-mover flag for clearance pricing).
- Restock predictor (sales velocity forecast)
- Sales report summarization (vendor asks "How were sales last week?") 

**Picker (operational):**
- AI substitution suggestions (out-of-stock → 3 alternatives from same category)
- Aisle-optimized route (pick list + shelf map → shortest path)
- Customer chat with templated translations (picker types Arabic, customer sees their language)
- Photo verification (vision verifies item count vs pick list)

**Customer (already shipped via Phase A-Re5+6):**
- Najma chat (gpt-4o-mini, key-optional)
- Fridge/Receipt/Photo Search (gpt-4o-mini vision, key-optional)
- Semantic search (Phase D7)
- For-you recommendations (collab filter + LLM rerank, Phase D7)

**Backbone (intelligence layer):**
- Fraud / abuse detection (order patterns, refund abuse)
- Demand forecasting (per-shop, per-SKU, next-week sales)
- Dynamic delivery radius (peak hours → shrink to maintain ETA)

---

## 7. Acceptance criteria for v1 close

**The shop:**
- ≥4 weeks daily PoS use with zero data loss
- ≥99% PoS uptime during shop hours
- Cashiers report PoS-vs-old-register: "faster" or "same"
- Vendor onboarded 5,000+ SKUs total in ≤2 weeks of camera-scan data entry

**The customers:**
- ≥10 customers placed ≥1 order
- ≥95% orders fulfilled without OOS cancellation
- ≥98% orders delivered within promised ETA
- Zero wrong-address deliveries
- ≥80% customer satisfaction (post-order rating ≥4/5)

**The platform:**
- Backbone uptime ≥99%
- Stock atomicity: zero over-sells across 30+ orders
- Sync correctness: 100% offline transactions reconciled within 1 hour of network resume
- AI cost ≤$50/month for the pilot shop (key-optional, but if enabled)

**The team:**
- Confidence the platform handles vertical #2 (restaurant or hypermarket) with mode-config, not rewrite

---

## 8. Resolved decisions (closed during 2026-05-25 review)

1. **Partner shop pattern** — Hamza is the primary tester. Two-stage validation: each phase first validated in Hamza's test environment; once approved, deployed to a real-environment partner shop (friend / official network) for live validation. We don't expose half-baked code to a real shop.

2. **Courier sourcing v1** — Hybrid model:
   - **Preferred:** target shops that *already have their own riders* (most Iraqi grocers do). Rider app onboards the shop's existing rider as a vendor-scoped courier.
   - **Fallback:** Hanoot hires a very small number (2-3) of riders to cover big metro areas where partner shops lack their own.
   - Both routed through the same Rider app; backbone assigns by `vendor_owned_rider OR hanoot_pool`.

3. **Vendor staff identity** — Multi-cashier per vendor confirmed mandatory. Each cashier has their own login + tracking (`cashier_id` on every sale). Vendor owner sees per-cashier reports. v1 supports up to ~10 cashiers per shop.

4. **Revenue model** — PoS perpetually free for v1 (no time limit promised). Paid tiers introduced minimum 1-2 years post-launch, after PMF. v1 says "free, no charges" in vendor sign-up copy. **Future revenue paths** (not v1): paid PoS tier with advanced analytics, take-rate on Hanoot customer orders (likely 5-10% of order value), payment-processing fee when card/digital lands.

5. **Data residency / deploy** — **Local-first development**: all v1 phases tested locally (docker-compose) before any Hostinger VPS push. Hostinger as the v1 production target. Migration to scalable cloud (AWS/Hetzner) when shop count or traffic demands.

6. **Team** — Hamza + Claude + subagents. No co-founder yet. Hamza's role: requirements / testing / partner-shop relationships / installing tools or plugins Claude requests. Claude's role: design + implementation via subagents. 9-month v1 is calibrated to this team shape.


---

## 9. Replaces & supersedes

This doc is the source of truth. Previously written docs that overlap:
- `2026-05-20-phase-a0-customer-ui-audit.md` — superseded; v1 plan now includes the whole platform, not just customer UI.
- `2026-05-20-phase-a-reskin-plan.md` — superseded; Phase A-Re shipped (commits b2bcfd9..bdebe9c) and is now the customer-app baseline.
- `2026-05-25-phase-a-reskin-plan.md` — superseded; same reason.
- Memory `project-phase-plan-2026-05-20.md` — superseded; new phases H/D/J/G/E replace the old D/B/C/E framing.

Future implementation plans descend from this doc via the `writing-plans` skill.

---

## 10. Next step

After your review and sign-off, hand off to `writing-plans` skill to produce a detailed step-by-step implementation plan for **Phase H-1 (Backbone-WMS)** — the critical-path first phase. Subsequent phases get their own implementation plans, each scoped to ~3-4 weeks of focused work.
