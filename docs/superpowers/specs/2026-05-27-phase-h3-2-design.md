# Phase H-3.2 — UI Redesign + Owner Power Tools

**Status:** Design spec, approved through brainstorming 2026-05-27 (19 visual screens, captured in `.superpowers/brainstorm/13239-1779831366/content/`).

**One-line goal:** Re-skin every H-3 surface to a Loyverse-grade polish bar, add the owner-side power tools (custom reports, customizable dashboard, full invoice editor, staff/permission UI, etc.), and lay the schema groundwork (super-admin role, commission ledger, audit log, departments surfaced, online-order channel) that the operations cockpit will fill in later.

**Replaces / extends:** [docs/superpowers/plans/2026-05-26-phase-h3-1-live-test-fixes.md](../plans/2026-05-26-phase-h3-1-live-test-fixes.md) — H-3.1 was the bug-fix follow-up to the live browser smoke test. H-3.2 is the design-first redesign that subsumes the open visual/UX items in that doc and adds the new surfaces brainstormed today.

---

## 1. Scope

### In scope (ship in H-3.2)

**Design system** — Hanoot-utility palette (extend customer DS), Manrope typography, polish-bar components, animation primitives, 4 responsive breakpoints, accessibility (prefers-reduced-motion, ARIA labels, keyboard nav).

**Cashier surfaces** (PoS app at `:9200`)
- Register screen v2 (tablet + phone layouts, swipe-actions, depth, scan pulse)
- Proactive alerts (bell + always-reachable alert panel; critical events block scan)
- Hanoot online-order inbox (3 tabs, accept/partial/reject inline, pick-list workflow, customer call)
- Settings v2 (theme picker w/ swatches, hardware status chips, quick-buttons drag-reorder)
- Keypad v2 (depth, quick-cash chips, live change calc, gold enter)
- Return/refund 3-step flow with manager-PIN gate
- End-of-day cash reconciliation (denomination grid + system-vs-counted diff)
- Inventory adjustment / stock-count flow (scan-and-correct + reason pills + summary)

**Manager surfaces** (PoS `/manager/*`)
- Catalog with Talabat-style sticky category rail + search bar with bottom-sheet picker
- AddProduct **search-first** wizard (catalog → OpenFoodFacts → "create new")
- AddProduct form: compact default + "More details" accordion with full expanded field set (description, brand, supplier, cost_price, tags, low_stock_threshold, images, internal_notes, schema-fields)
- Department surfaced as required-optional field, separate "Manage departments" screen with drag-reorder + AI-suggested dept presets per industry
- CSV import: drag-drop → animated progress → confetti success + inline error report
- Bulk catalog actions: multi-select + sticky toolbar + inline price-edit sheet
- Tag manager with AI-suggested tags + featured-vs-internal split

**Owner admin surfaces** (new admin app at `:9300`)
- Dashboard hero (greeting + 3 vitals + 4 hover-lift stat tiles + 4-banner library: critical / warning / tip / promo)
- Customizable dashboard (drag widgets, named saved layouts, widget picker)
- Custom report builder (metric picker + group-by + filters + live preview + CSV/Excel/PDF export + scheduled email + saved reports)
- Drill-down detail views (sales-over-time bar chart, top-SKUs table, cashier perf, expiry calendar)
- Receipt/invoice designer with **social handles** (Instagram, Facebook, TikTok, WhatsApp, web), QR code, layout presets, Western/Arabic numerals, format toggles, live preview
- Staff CRUD with **per-user permission overrides** (role default + per-row toggle + reset-to-default)
- Customer profile (VIP pill, lifetime stats, order history, top products, private notes, call/WhatsApp/credit/flag actions)
- Notification center with severity-colored rows + per-channel push prefs + quiet hours
- Promotions UI v1 (build / save / activate 3 promo types: % off, fixed off, B2G1) — discount engine ships in v2; UI shell + storage in v1
- Day×hour heatmap (sales density + AI-narrated insight)
- Mobile-responsive (admin app at phone breakpoint: bottom tabs + 2-col stats + alert cards + hero)
- Onboarding tour (welcome screen with 5-step checklist + spotlight tour overlay with dot pagination)

**Super-admin** (stub-only in H-3.2)
- Add `users.is_super_admin` boolean + `requireSuperAdmin` route guard middleware
- Admin app sidebar shows locked "Hanoot ops" section (All shops / Alerts feed / Revenue / Activity log / Onboard) — locked panels render "Mockup designed today, built when shop #2 onboards"
- Full views ship when 2nd vendor onboards (H-3.3 or later)

**Schema foundations** (must land in H-3.2 even though views may ship later)
- Vendor (tenant) columns: `commission_rate_bps`, `status`, `onboarded_at`, `industry`
- `pos_sale.channel` enum: `offline` (default) | `online` (set when D-2's online orders flow exists)
- `online_order.commission_rate_bps_snapshot` + `commission_minor` (snapshot at confirmation time so retroactive rate changes don't rewrite history)
- `online_order.payout_status` enum: `pending` | `paid` | `disputed`
- `platform_audit_log` table — every mutating route emits one row via middleware: `vendor_id`, `actor_id`, `module`, `action`, `entity_id`, `before_json`, `after_json`, `created_at`
- `cashier.permission_overrides` JSONB (role-default + per-user overrides)
- `merch_category` already exists — surface it in AddProduct + add Manage screen
- `catalog_schema_category.industry_seeds` for auto-seeding departments per industry

### Out of scope (deferred)

| Feature | Why deferred | When |
|---|---|---|
| Super-admin operations cockpit (all shops grid, shop detail tabs, activity log UI, revenue ledger UI) | Useless at 1 pilot shop; design captured | When shop #2 onboards |
| Customer-facing app changes | Customer DS already shipped in 2026-05-21 design pack; no H-3.2 changes | — |
| Picker app (vision Phase J) | Cashier covers picking in v1 pilot (Hanoot orders) | Phase J |
| Rider app (vision Phase G) | Out of H-3 scope | Phase G |
| D-1 customer ↔ backbone wire | Separate phase | Phase D-1 |
| Voice-add (Arabic/Kurdish catalog entry) | Polish add-on, AI cost question | v2 polish |
| Per-vendor brand color/logo upload | Add-on #10 from screen 14 — keep noted, ship if H-3.2 has headroom | If headroom |
| Customer impersonation mode (super-admin) | Pairs with super-admin views | H-3.3 |

### Non-goals

- We do NOT redesign customer-facing app screens in H-3.2.
- We do NOT add new payment integrations (card, Zain, FastPay) — COD only per vision doc.
- We do NOT build the discount-application engine itself — only the promo CRUD UI + storage; calculation/application at the register lands in v2.
- We do NOT migrate H-3.1's dev-auth shim to a per-vendor scoped token model yet — that's its own phase (H-3.1 OPEN #1).

---

## 2. Design decisions (the brainstorming summary)

Quick reference for what was chosen and why. Detailed mockups in `.superpowers/brainstorm/13239-1779831366/content/`.

| # | Decision | Choice | Rationale |
|---|---|---|---|
| 01 | Design language | **B · Hanoot-utility** (extend customer DS palette + Loyverse density) | One brand voice; reuse design tokens |
| 02 | AddProduct pattern | **A · Search-first** | Prevents duplicate SKUs; matches Loyverse/Talabat |
| 03 | Product field layout | **A · Compact** (collapsed) + full expanded field set | Fast aisle entry stays fast; power users expand |
| 04 | Departments | Surface existing `merch_category` per-vendor + Manage Departments screen + industry-seeded defaults | Two concepts (industry vs browse) separated cleanly |
| 05 | Staff mgmt location | **A · Admin web app** with per-user permission overrides | Owner-only operation; mobile-responsive |
| 06 | Super-admin scope | **B · Design now, build when 2nd shop onboards** + schema commitments today | Schema decisions can't be undone later; views can wait |
| 07 | Alerts visibility | Matrix: OOS/expiry/low/drift/orders to cashier+manager+owner; platform-level (offline/OOS-spike/multi-shop) to super-admin. Cashier has proactive alerts surface (not only on scan-block) | Cashier is operational; super-admin is platform |
| 08 | Typography | **A · Manrope** (extend customer DS) + JetBrains Mono for numerals | Brand consistency; 80kb one-time cost acceptable |
| 09 | Polish bar | Buttons with depth + tap-bounce, badges, inputs w/ focus/error, cards, empty states with personality, skeleton loaders, tinted toasts, modals | Compounds across every screen |
| 10 | Window shell | Desktop sidebar / Tablet top tabs / Phone bottom tabs + FAB; breakpoints 768 / 1024 / 1440 | Native feel per device |
| 11 | Dashboard hero | Gradient hero with greeting + 3 vitals + glassy CTA; 4 hover-lift stat tiles; 4-banner library | Reads like Linear/Vercel dashboards |
| 12 | Sticky category rail | Talabat-style vertical icon nav pinned left + sticky dept headers + scroll-spy | Phone-optimized browse |
| 13 | Animations | GPU-only (transform/opacity); CSS keyframes; `prefers-reduced-motion`; fade/slide/stagger/bounce/shimmer/count-up | <1% main-thread overhead |
| 14 | Bottom sheets | Action / picker / filter variants | Talabat pattern; in-context |
| 15 | Keypad v2 | Depth + quick-cash chips (+1k/+5k/+10k/+25k) + live change | Speeds payment |
| 16 | Drag-to-reorder | Long-press grip + tilt + drop-zone glow | Departments, quick-buttons, tags |
| 17 | Spotlight ⌘K | Manager + admin only (skip cashier) | Power-user feature |
| 18 | Permission model | Role default + per-user JSONB overrides + data-driven matrix (new capabilities = new rows, not code) | Vision doc Section 2 "role configurable from day 1" |
| 19 | Commission default | 7% per-vendor configurable; snapshot rate at order confirmation; never retroactively change | Audit/disputes need historical accuracy |
| 20 | Cashier accepts Hanoot orders | Full accept/partial/reject (was read-only in initial matrix) | Cashier is the only person on the counter to physically check stock in real-time |

---

## 3. Design system

### 3.1 Color palette

Extends the customer-DS palette from `docs/superpowers/design-pack-2026-05-21/hanoot/design-system.jsx`. Same tokens; staff surfaces use them in Loyverse-style density.

```
--ivory:    #f4ede1    /* page background, soft sections */
--paper:    #faf6ee    /* card surfaces, body bg */
--paper-2:  #ffffff    /* elevated cards on paper */
--ink:      #1f1c18    /* primary text, dark headers */
--ink-2:    #2a2520    /* gradient end on dark */
--ink-3:    #6f6859    /* secondary text */
--line:     #b9af9b    /* strong borders */
--line-2:   #d4ccba    /* default borders */
--line-3:   #e5dfd0    /* subtle dividers */
--line-4:   #f0e9d8    /* very subtle dividers */

--gold:     #b88a3a    /* primary accent */
--gold-2:   #c89844    /* gradient start (hover/elevated) */
--gold-3:   #8a6228    /* gradient end (deep/active) */

--emerald:  #2f6a55    /* success accent */
--emerald-2:#387762    /* gradient start */
--burgundy: #862a3a    /* danger accent */
--burgundy-2:#9d3548   /* gradient start */

--amber:    #d4a14e    /* warning accent (lighter gold variant) */

--bg-success: rgba(47,106,85,.12)
--bg-warn:    rgba(184,138,58,.12)
--bg-danger:  rgba(134,42,58,.12)
```

CSS vars under `:root` and `[data-theme='dark']` (dark theme inverts ivory/ink — used by cashier register only, opt-in).

### 3.2 Typography

| Style | Family | Weight | Size | Use |
|---|---|---|---|---|
| Display | Manrope | 800 | 26–28px | Hero stats, screen titles when standalone |
| H1 | Manrope | 800 | 18px | Screen titles |
| H2 | Manrope | 700 | 14px | Section titles |
| Body | Manrope | 500 | 13px | Default text |
| Caption | Manrope | 600 | 11px | Metadata, helper text |
| Label | Manrope | 800 (uppercase, 0.06em tracking) | 10px | Section labels above fields/groups |
| Numeric | JetBrains Mono | 500–700 | 13–24px | All money, counts, IDs, dates |
| Arabic | Noto Sans Arabic | 700 | (matches latin sizes) | Arabic/Kurdish text |

`font-feature-settings: 'tnum'` on all numeric displays so digit widths stay aligned in tables.

### 3.3 Spacing scale (4-point base)

```
4 · xs   8 · sm   12 · md   16 · lg   24 · xl   32 · 2xl   48 · 3xl
```

All padding/margin/gap come from this scale. No magic numbers in styles.

### 3.4 Radii

```
4  · sharp (pills, chips, small buttons)
6  · inputs, qty buttons
8  · buttons, cards
10 · cards (default)
12 · prominent cards, banners
14 · sections, modals
16 · hero, illustration boxes
22 · phone screens
24 · modal sheets
999 · full pills
```

### 3.5 Shadows

```
sm:  0 1px 2px rgba(31,28,24,.06)
md:  0 4px 12px rgba(31,28,24,.08)
lg:  0 8px 24px rgba(31,28,24,.12)
xl:  0 16px 40px rgba(31,28,24,.18)
2xl: 0 24px 60px rgba(0,0,0,.3)        /* modal */

inset:  0 1px 0 rgba(255,255,255,.4) inset   /* button highlight */
brand:  0 4px 12px rgba(184,138,58,.3)        /* gold glow on primary */
```

### 3.6 Component vocabulary

| Component | Description | Where used |
|---|---|---|
| `btn-primary` | Gold gradient + inset highlight + tap-bounce | Single primary action per screen |
| `btn-secondary` | Bordered with paper gradient + hover-gold-border | Cancel, secondary actions |
| `btn-soft` | Tinted gold background, no border | Inline actions like "+ Add", "Lookup" |
| `btn-danger` | Burgundy gradient + inset highlight | Delete, void, reject |
| `btn-ghost` | Text-only, hover-tint background | Tertiary actions, links |
| `btn-pill` | Small rounded-full, dark | Inline card actions |
| `btn-icon` | 38px circular, paper bg | Toolbar icons (settings, bell, search) |
| `btn-fab` | 56px circular, gold gradient, glow | Mobile "+ Add" anchor |
| `badge` | Pill 3px×8px, 5 variants (ok/warn/crit/info/quiet) | Status indicators |
| `input` | Paper bg + line border, focus = gold border + brand-tinted glow, error = burgundy | All forms |
| `card` | Paper-2 bg + line-3 border + sm shadow + hover-md shadow + 1px translate | Lists, rows |
| `stat-tile` | Paper-2 → paper gradient + corner icon + label + big num + trend | Dashboard tiles |
| `toast` | Dark default, success/warn/error tinted, slides from top, auto-dismiss 4s | Transient feedback |
| `bottom-sheet` | Slides from bottom with dim backdrop, 3 variants (action/picker/filter) | In-context overlays |
| `modal` | Centered, 16 radius, dim backdrop blur, primary+ghost actions | Destructive confirms only |
| `popover` | Anchored to trigger, popIn animation, auto-close outside-click | Row-level ⋯ menus |
| `skeleton` | 90deg shimmer gradient | Loading states |
| `spotlight` | Full-overlay search modal (⌘K) | Manager + admin (not cashier) |
| `tour-popover` | Spotlight cutout + dot-paginated popover | Onboarding only |

### 3.7 Animation primitives

All GPU-only (transform / opacity), CSS keyframes, paused under `prefers-reduced-motion`.

| Animation | Curve | Duration | Use |
|---|---|---|---|
| fade-in | ease-out | 400ms | Cards, toasts, modal content |
| slide-up | cubic-bezier(0.16, 1, 0.3, 1) | 400–500ms | Sheets, bottom toasts, popovers |
| slide-down | cubic-bezier(0.16, 1, 0.3, 1) | 300ms | Order toast (top), bulk toolbar |
| stagger | ease-out, 100ms delay between siblings | 400ms each | List mounts |
| tap-bounce | ease | 100ms | `scale(0.96)` on `:active` |
| hover-lift | ease | 150ms | `translateY(-1px)` + shadow upgrade |
| pulse | ease-in-out | 1.5s loop | Scan-ready indicator dot |
| shimmer | linear | 1.4s loop | Skeleton loaders |
| count-up | ease-out | 800ms | Stat numbers on dashboard mount |
| bumpIn | cubic-bezier(0.16, 1, 0.3, 1) | 400ms | Hanoot order arrival toast |
| popIn | cubic-bezier(0.16, 1, 0.3, 1) | 200ms | Contextual popovers |
| dim-in | ease-out | 250ms | Modal backdrop |
| confetti-fall | ease-in | 2.5s | CSV import success only (rare = special) |
| wiggle | ease | 400ms hover-only | Subtle button playfulness |

### 3.8 Breakpoints

| Name | Range | Layout |
|---|---|---|
| Phone | < 768px | Bottom tab bar nav · 1-col content · FAB pinned bottom-right · max-width 100% |
| Tablet | 768–1023px | Top tabs nav · 1–2-col content · max-width 100% |
| Desktop | 1024–1439px | Left sidebar nav · 2–3-col content · max-width 1280px centered |
| Wide | ≥ 1440px | Left sidebar nav · 3-col content · max-width 1280px centered |

Every surface in this spec MUST work across all 4 breakpoints. Mockups in the brainstorming demonstrate at least 2 form factors per surface.

---

## 4. Information architecture

### 4.1 Apps and roles

| App | Port | URL | Primary role | Other roles |
|---|---|---|---|---|
| Customer super-app | (Expo) | mobile only | Customer | — |
| PoS register + manager | 9200 | pos.hanoot.iq | Cashier | Manager (PIN-gated `/manager/*`) |
| Vendor + Super-admin admin | 9300 | admin.hanoot.iq | Owner | Manager, Super-admin (role-gated) |

The admin app at `:9300` is shared between vendor-owner (default) and super-admin (Hanoot ops) via `users.is_super_admin`. The Hanoot-ops sidebar section is invisible to non-super-admins.

### 4.2 Sidebar / navigation maps

**PoS Manager mode (`/manager/*`)**
- 📦 Catalog
- 📥 CSV Import
- 🏷 Departments
- 🔖 Tags
- ⚠ Alerts
- 👥 Quick PIN reset (only — full staff CRUD lives in admin app)
- ⚙ Settings
- 📊 Stock count (inventory adjustment)

**Vendor admin (`:9300/`)**
- 📊 Dashboard
- 📦 Catalog
- 📈 Reports + drill-downs
- 📋 Custom reports (builder + saved + scheduled)
- 🧾 Receipt designer
- 🎁 Promotions
- 🔔 Notifications
- 👥 Customers
- 👥 Staff
- 🏪 Shop settings

**Hanoot ops (`:9300/super-admin/*`) — locked stub in H-3.2**
- 🌐 All shops
- ⚠ Alerts feed (platform-level)
- 💰 Revenue & commission
- 📋 Activity log
- 🆕 Onboard vendor

### 4.3 Permission matrix (data-driven, role default + per-user override)

Stored as JSONB on `cashier.permission_overrides`. Default set per role lives in `users.role_default_permissions` (seeded migration). UI: screen 16's per-user matrix with "OVERRIDE ON/OFF" tags.

Default v1 capabilities (`true` = granted by default; cells marked `*` mean PIN re-prompt):

| Capability key | Owner | Manager | Cashier | Data-entry | Picker |
|---|---|---|---|---|---|
| `pos.ring_sales` | ✓ | ✓ | ✓ | — | — |
| `pos.open_cash_drawer` | ✓ | ✓ | ✓ | — | — |
| `pos.refund_or_void` | ✓ | ✓ | * | — | — |
| `pos.return_process` | ✓ | ✓ | * | — | — |
| `pos.end_of_day` | ✓ | ✓ | ✓ | — | — |
| `catalog.add_edit_product` | ✓ | ✓ | — | ✓ | — |
| `catalog.csv_import` | ✓ | ✓ | — | ✓ | — |
| `catalog.bulk_edit` | ✓ | ✓ | — | ✓ | — |
| `catalog.manage_departments` | ✓ | ✓ | — | — | — |
| `catalog.manage_tags` | ✓ | ✓ | — | — | — |
| `catalog.adjust_stock` | ✓ | ✓ | — | ✓ | — |
| `catalog.stock_count` | ✓ | ✓ | — | ✓ | — |
| `catalog.report_damage` | ✓ | ✓ | * | — | — |
| `orders.accept_reject_online` | ✓ | ✓ | ✓ | — | — |
| `orders.pick_workflow` | ✓ | ✓ | — | — | ✓ |
| `reports.view` | ✓ | ✓ | — | — | — |
| `reports.export` | ✓ | ✓ | — | — | — |
| `reports.custom_build` | ✓ | — | — | — | — |
| `staff.manage` | ✓ | — | — | — | — |
| `staff.reset_pin` | ✓ | ✓ | — | — | — |
| `shop.settings_edit` | ✓ | — | — | — | — |
| `shop.receipt_designer` | ✓ | — | — | — | — |
| `shop.promotions` | ✓ | — | — | — | — |
| `shop.notifications_prefs` | ✓ | ✓ | ✓ | ✓ | ✓ |

Owner can toggle any cell per-user via the form in screen 16 (saves to `cashier.permission_overrides.<capability_key> = true|false`).

Adding a new capability later = adding a row to the `capabilities` table (seeded constant) + middleware check on the route. No code change to the matrix UI.

---

## 5. Backend changes

### 5.1 New tables

#### `platform_audit_log`
Every mutating route emits one row via Medusa middleware.
```sql
CREATE TABLE platform_audit_log (
  id text PRIMARY KEY,
  vendor_id text NOT NULL,
  actor_id text,                  -- user_id or cashier_id
  actor_type text NOT NULL,       -- 'user' | 'cashier' | 'system'
  module text NOT NULL,           -- 'catalog' | 'wms' | 'pos_terminal' | 'orders' | ...
  action text NOT NULL,           -- 'create' | 'update' | 'delete' | 'adjust' | 'refund' | ...
  entity_id text,
  before_json jsonb,
  after_json jsonb,
  metadata jsonb,                 -- ip, user agent, etc.
  created_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_vendor_created ON platform_audit_log(vendor_id, created_at DESC);
CREATE INDEX idx_audit_module_action ON platform_audit_log(module, action);
```

#### `online_order` (forward-compat for D-2; created empty in H-3.2)
```sql
CREATE TABLE online_order (
  id text PRIMARY KEY,
  vendor_id text NOT NULL,
  customer_id text,
  total_minor numeric NOT NULL,
  currency_code text NOT NULL,
  status text NOT NULL,           -- 'pending' | 'accepted' | 'rejected' | 'picking' | 'delivered' | 'cancelled' | 'refunded'
  commission_rate_bps_snapshot integer NOT NULL,
  commission_minor numeric NOT NULL,
  payout_status text NOT NULL DEFAULT 'pending',  -- 'pending' | 'paid' | 'disputed'
  channel text NOT NULL DEFAULT 'hanoot',
  placed_at timestamptz NOT NULL,
  -- ... line items via online_order_line
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  deleted_at timestamptz
);
```

#### `cashier.permission_overrides` (alter existing)
```sql
ALTER TABLE pos_cashier ADD COLUMN permission_overrides jsonb DEFAULT '{}'::jsonb;
```

#### Vendor (tenant) columns
```sql
ALTER TABLE tenant ADD COLUMN commission_rate_bps integer DEFAULT 700;       -- 7%
ALTER TABLE tenant ADD COLUMN status text DEFAULT 'active';                   -- 'active' | 'paused' | 'offboarded'
ALTER TABLE tenant ADD COLUMN onboarded_at timestamptz;
ALTER TABLE tenant ADD COLUMN industry text;                                  -- 'grocery' | 'clothes' | 'pharmacy' | 'salon' | 'restaurant' | 'other'
```

#### `pos_sale.channel` (alter existing)
```sql
ALTER TABLE pos_sale ADD COLUMN channel text NOT NULL DEFAULT 'offline';
CREATE INDEX idx_pos_sale_channel ON pos_sale(channel);
```

#### `users.is_super_admin`
```sql
ALTER TABLE "user" ADD COLUMN is_super_admin boolean NOT NULL DEFAULT false;
```

#### `notification` (new module)
```sql
CREATE TABLE notification (
  id text PRIMARY KEY,
  vendor_id text,           -- nullable for platform-level
  user_id text NOT NULL,    -- recipient
  type text NOT NULL,       -- 'stock_oos' | 'stock_expired' | 'order_new' | ...
  severity text NOT NULL,   -- 'critical' | 'warning' | 'info'
  title text NOT NULL,
  message text,
  link_path text,           -- where tapping takes you
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notif_user_unread ON notification(user_id, read_at) WHERE read_at IS NULL;
```

#### `notification_prefs` (per-user)
```sql
CREATE TABLE notification_prefs (
  user_id text PRIMARY KEY,
  push_critical boolean DEFAULT true,
  push_orders boolean DEFAULT true,
  push_low_stock boolean DEFAULT false,
  push_daily_summary boolean DEFAULT true,
  quiet_hours_start time,
  quiet_hours_end time,
  quiet_hours_enabled boolean DEFAULT false
);
```

#### `promotion` + `promotion_target`
```sql
CREATE TABLE promotion (
  id text PRIMARY KEY,
  vendor_id text NOT NULL,
  name text NOT NULL,
  description text,
  type text NOT NULL,            -- 'percent_off' | 'fixed_off' | 'buy_x_get_y'
  value numeric NOT NULL,        -- 20 for 20%, 1000 for 1k IQD off, etc.
  starts_at timestamptz,
  ends_at timestamptz,            -- nullable = recurring
  recurrence text,                -- 'weekdays' | 'weekends' | 'daily' | 'always' | null
  hours_start time,               -- nullable
  hours_end time,                 -- nullable
  min_order_minor numeric,
  status text DEFAULT 'draft',    -- 'draft' | 'active' | 'paused' | 'expired'
  created_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE TABLE promotion_target (
  promotion_id text NOT NULL,
  target_type text NOT NULL,      -- 'product' | 'department' | 'tag' | 'all'
  target_id text                  -- nullable for 'all'
);
```

NOTE: H-3.2 ships promo CRUD + storage only. The discount-application engine (applying promos at the register) ships in v2.

#### `report_definition` (saved custom reports)
```sql
CREATE TABLE report_definition (
  id text PRIMARY KEY,
  vendor_id text NOT NULL,
  user_id text NOT NULL,
  name text NOT NULL,
  metrics jsonb NOT NULL,         -- ['revenue', 'units_sold', 'oos_count']
  group_by jsonb NOT NULL,        -- ['week']
  filters jsonb NOT NULL,         -- {departments: ['dairy'], channels: ['online','offline'], date_range: 'last_7d'}
  schedule jsonb,                 -- {weekly_email: true, day: 'monday', time: '08:00', recipients: [...]}
  created_at timestamptz NOT NULL DEFAULT NOW()
);
```

#### `inventory_count_session`
```sql
CREATE TABLE inventory_count_session (
  id text PRIMARY KEY,
  vendor_id text NOT NULL,
  actor_id text NOT NULL,
  scope text NOT NULL,                -- 'all' | 'department:<id>' | 'product:<ids>'
  status text NOT NULL,               -- 'in_progress' | 'applied' | 'cancelled'
  expected_total numeric,
  counted_total numeric,
  delta_total numeric,
  note text,
  started_at timestamptz NOT NULL DEFAULT NOW(),
  applied_at timestamptz
);
CREATE TABLE inventory_count_line (
  session_id text NOT NULL,
  variant_id text NOT NULL,
  system_qty numeric NOT NULL,
  actual_qty numeric,
  delta numeric,
  reason text                          -- 'damaged' | 'theft' | 'miscount' | 'received_late' | 'expired' | 'other'
);
```

#### `cash_session` (end-of-day reconciliation)
```sql
CREATE TABLE cash_session (
  id text PRIMARY KEY,
  vendor_id text NOT NULL,
  terminal_id text NOT NULL,
  cashier_id text NOT NULL,
  opened_at timestamptz NOT NULL,
  opening_float_minor numeric NOT NULL,
  cash_sales_minor numeric,
  refunds_minor numeric,
  expected_total_minor numeric,
  counted_total_minor numeric,
  diff_minor numeric,                  -- positive = over, negative = short, 0 = match
  denomination_count jsonb,            -- {"50000":3,"25000":4,"10000":7,...}
  note text,
  closed_at timestamptz,
  status text NOT NULL                 -- 'open' | 'closed'
);
```

### 5.2 New modules

| Module | Purpose | Service key |
|---|---|---|
| `notifications/` | CRUD notifications + dispatch (push, email, in-app) | `notificationsService` |
| `promotions/` (CRUD-only in H-3.2) | Promo CRUD + storage | `promotionsService` |
| `reports_definitions/` | Saved/scheduled custom reports | `reportDefinitionsService` |
| `inventory_count/` | Stock count session + apply | `inventoryCountService` |
| `cash_session/` | End-of-day reconciliation | `cashSessionService` |
| `audit_log/` | Append-only audit + query API | `auditLogService` |
| `customers/` | Customer profile + lifetime stats (read from existing tables, surface in admin) | `customerProfileService` |

Plus extensions to existing modules: `pos_terminal` adds `processReturn()`, `wms` adds `applyCountAdjustments()`, `tenant` adds the new columns.

### 5.3 Audit middleware

Single Medusa middleware (`backend/apps/backend/src/api/middlewares.ts`) wraps every `/admin/*`, `/vendor/*`, `/super-admin/*` mutating route. On 2xx response, emits one `platform_audit_log` row using request context (actor from auth, vendor from query/body, before/after captured via Medusa workflow events).

---

## 6. Surface-by-surface specifications

### 6.1 Cashier surfaces (PoS at `:9200`)

#### Register screen (tablet)
- Layout: 1.2fr cart left / 1fr quick-actions right
- Dark gradient header anchor (logo + cashier + net + bell with badge + ⚙)
- Scan-ready indicator: dashed border zone + pulsing green dot
- Cart items: hover-lift, qty controls, swipe-left to remove (mobile) / right ⋯ menu (desktop)
- Charge button: gold gradient, depth, hover-lift, dynamic label "Charge · 13,500 IQD"
- Right panel tabs: Departments (default) / Favorites / Orders
- Quick-tile grid 2-col with hover-lift

#### Register screen (phone)
- Same components, single column
- Quick-actions collapse to bottom drawer / "Orders" pill in header
- Hanoot-order toast slides from top with sound + Open CTA
- Critical scan errors interrupt (expired item blocks line, shows banner)

#### Hanoot order inbox
- 3 tabs: Pending · Picking · Done
- Order cards: red left-border (urgent), gold (new), neutral
- Inline Accept / Partial / Reject actions (no extra screen)
- "All caught up" empty state with reassuring illustration

#### Order detail
- Customer card (avatar + name + phone + prior orders + call button)
- Pick-list with checkbox workflow + OOS state per line
- Delivery address + map placeholder + voice-note playback (when available)
- Sticky bottom action: Cancel / Hand to rider

#### Cashier alert panel (proactive)
- Bell icon in header with badge count
- Tap opens slide-down panel under header
- Reachable any time, not only on scan-block
- Rows: severity icon + title + meta + sev pill

#### Keypad v2 (payment screen)
- Dark header with total + paid input + live change
- Quick-cash chips row (+1k +5k +10k +25k IQD)
- 3-col digit grid with depth + tap-bounce
- Gold Enter button full-width with dynamic label

#### Settings
- Sectioned: Appearance / Hardware / Operations / Manage quick-buttons
- Theme picker: dark / light swatches with live preview
- Hardware status chips with green pulse
- Toggles with on-state in gold or emerald
- Manager-only entry to deeper config (quick-buttons drag-reorder, hardware pairing)

#### Return/refund 3-step flow
- Step 1: Scan QR / enter receipt ID / pick from recent
- Step 2: Receipt card with checkbox per line + reason chips (damaged / expired / changed mind / wrong item)
- Step 3: Refund method (cash / store credit) + manager-PIN prompt + summary
- Audit log entry per refund

#### End-of-day cash reconciliation
- Denomination grid (6 IQD denominations × note count input × total live)
- System-vs-counted card with diff (over/match/short) + reason note
- Closing requires note if diff != 0
- Creates `cash_session` row with everything

#### Inventory adjustment / stock count
- Pick scope (whole shop / department / specific products)
- Scan-and-enter actual count per item
- Live diff vs system (+green / −red / zero gray)
- Reason pill per row (damaged / theft / miscount / received_late / expired)
- Summary card before applying (net delta, value impact, top reason)
- Creates `inventory_count_session` + applies stock movements

### 6.2 Manager surfaces (PoS `/manager/*`)

#### Catalog list with sticky rail
- Talabat-style: vertical icon nav pinned left + product list right with sticky dept headers
- Scroll-spy: rail auto-highlights current dept
- Header search bar opens spotlight overlay (⌘K or tap 🔍)
- Hover-lift product cards with thumbnail, name, meta, mono price, color-coded stock
- FAB pinned bottom-right (phone) / inline + Add button (desktop)
- Bulk-select mode: long-press or click checkbox → sticky toolbar slides down

#### AddProduct (search-first wizard)
- Open: top search bar + scan camera button
- Live results split: "In your catalog" (with EDIT pill) vs "From OpenFoodFacts" (with ADD pill)
- "Create new from scratch" sticky bottom CTA
- After picking "create new" → form with required fields (title/price/category) + collapsed "More details" accordion
- Category picker = bottom sheet
- Department picker = bottom sheet with vendor's list + "+ New department" inline
- Schema fields per category rendered below required fields
- Pre-fill from OpenFoodFacts when barcode lookup succeeds + AI classify the category

#### AddProduct (full field set when expanded)

Required: `title`, `price_minor`, `currency_code`, `category_handle`
Optional: `description`, `brand`, `tags[]`, `cost_price_minor`, `supplier_name`, `low_stock_threshold`, `barcode`, `sku`, `initial_on_hand`, `images[]`, `internal_notes`, `schema_fields.*`, `merch_category_id` (department)

#### Manage Departments
- Sticky industry section header
- Drag-grip rows with icon + name + product count + alerts mini-stat
- Tap row → edit name/icon/position
- "+ Add a department" dashed-border button
- Industry-seeded list per vendor on first run (grocery → Dairy/Bakery/Baby/Beverages/Frozen/Fresh/Snacks/Care)

#### Tag manager
- Same shape as Departments
- Featured section (gold treatment, surfaces in customer browse) + All tags section
- AI-suggested tag card at top ("82% of grocery would qualify for halal — add it?")
- Drag-reorder, click-edit, "+ Add tag" inline

#### CSV import
- 3 states: drag-drop idle / file card with animated progress / success with confetti
- "While we work" inline tip during upload (AI auto-categorization, switch tabs OK)
- Per-row error list inline after import (row number + reason)
- Re-upload fixed CSV → diff and only add new

#### Bulk catalog actions
- Multi-select: long-press / checkbox
- Sticky dark toolbar slides down with count + actions (Change price / Move dept / Add tags / Adjust stock / Delete)
- Inline edit sheet for selected action (e.g., +5% / absolute / department picker)
- Confirm with summary of affected rows

#### Stock count entry point
- Sidebar nav item; opens new count session
- Same flow as cashier surface but accessible from anywhere

### 6.3 Owner admin surfaces (admin app at `:9300`)

#### Dashboard
- Hero: gradient background, greeting + shop name + 3 vitals (revenue / orders / online), glassy "View all reports" CTA
- 4 stat tiles row (catalog / low / expiring / staff) — hover lift + auto-update on data change
- 4-banner library row: critical (red), warning (gold), tip (emerald), promo (paper) — dismissable per-vendor
- Click any tile or banner → drill-down screen
- "Customize" pill toggles edit mode (dashed borders, drag, × delete, + Add widget, widget picker, save layout)

#### Customizable dashboard (edit mode)
- Widget catalog: 15 widgets across 3 categories (Money / Inventory + ops / People + channels)
- Drag-reorder + resize (small / medium / wide)
- Save as named layouts ("Daily", "Weekly review", custom)
- Switch layouts via pill row

#### Reports drill-downs
- 4 drill-downs from stat tiles: Sales over time · Top SKUs · Cashier performance · Expiry calendar
- Each: filter chips at top (time range, channel) + chart + ranked table
- Drill into row → individual product report

#### Custom report builder
- 3-pane: metrics + group-by + filters (left) / live preview chart + table (middle) / format + schedule + saved (right)
- Available metrics: revenue / units / margin / OOS / refunds / discount
- Group by: day / week / dept / cashier / channel
- Export: CSV / Excel / PDF / shareable link
- Schedule: one-time / weekly email with recipient picker
- Save as named report for reuse + edit

#### Receipt designer
- Split editor / preview
- Left: Shop header / Social (Instagram, Facebook, TikTok, WhatsApp, web) / Layout format (logo top vs left, Western vs Arabic numerals) / Show on receipt toggles / Footer text
- Right: live ESC/POS preview on dark surface (same bytes drive preview and printer)
- "Print test receipt" button → sends to paired printer

#### Staff CRUD + permission editor
- List of staff with avatar, name, role pill, last activity, contextual ⋯ menu
- Add/edit form: split layout
- Left: avatar upload + name + phone + 4-digit PIN (numeric pad UI + 🎲 randomize) + role card picker
- Right: permission matrix grouped (PoS / Catalog / Orders & reports / Staff & shop) with toggle per row + "OVERRIDE ON/OFF" tags + "Reset to default" link
- Save creates staff with role_default + overrides JSONB

#### Customer profile
- Split layout: identity card left, tabs right
- Identity card: avatar + name + phone + VIP pill (top 5% lifetime spend) + 4 stat tiles + action buttons (📞 Call / 💬 WhatsApp / 🎁 Send credit / ⚠ Flag) + private note
- Tabs: Order history (with status badges) / Top products / Returns / Notes
- Surface in: order detail customer card click-through, search by name in spotlight, customers sidebar item

#### Notification center
- Tabs: All / Alerts / Orders / System (with unread count badges)
- Rows: severity icon + title + message + meta (time + source) + optional action chip
- Unread = left border in severity color
- Date dividers (Today / Yesterday / ...)
- Mark all read action in header

#### Notification preferences
- Per-channel push toggles (critical / orders / low-stock / daily summary)
- Quiet hours toggle + start/end picker
- Critical alerts override quiet hours

#### Promotions
- Active promos: gold-gradient cards with live stats (uses / revenue / margin lost / lift)
- Builder: 3 type cards (% off / fixed off / B2G1) → configure form (discount / applies-to picker / schedule / min-order)
- Save draft / Activate

NOTE: H-3.2 ships CRUD + storage only. Discount application at register lands in v2.

#### Day×hour heatmap
- 7×24 grid colored by sales density (light cream → deep gold)
- Hour labels top, day labels left
- Color legend (Less ↔ More)
- AI insight box below: "Saturday 13–15h is your peak — staff accordingly"

#### Mobile vendor admin (responsive)
- Phone: top bar (shop avatar + name + bell), gradient hero, 2-col stat row, alert cards, bottom tab bar (Home / Catalog / Reports / Staff / More)
- All admin surfaces fold to phone using the breakpoint rules in §3.8
- Mobile-specific: pull-to-refresh, swipe-left-on-row for quick actions, FAB for primary CTA

#### Onboarding
- Welcome screen: logo + greeting + 5-item setup checklist (verify shop / first cashier / departments / scan/import products / take tour) with time estimates
- Persistent "Resume setup" pill in header until checklist complete
- Tour overlay: spotlight cutout + popover with copy + dot pagination + skip
- ~5 tour steps across main surfaces; total ~30 seconds

### 6.4 Super-admin (Hanoot ops) — STUB in H-3.2

- Sidebar section "Hanoot ops" visible only when `users.is_super_admin = true`
- All 5 nav items render a locked panel: "Mockup designed today, built when shop #2 onboards" with screenshot of the designed view
- Schema commitments shipped (see §5)
- Full views implemented in H-3.3 or later when shop #2 onboards

---

## 7. Add-on polish details (also in scope)

From screen 14 — 10 add-ons, all approved in scope:

1. **Optimistic UI on every write** — instant UI update + background sync + rollback toast on error
2. **Pull-to-refresh on every list** — native phone gesture
3. **Swipe actions on rows** — left for delete/archive on cart; left for accept/reject on order cards
4. **Confetti** — CSV import success only (rare = special)
5. **Smart autocomplete in search** — typo-tolerant, Arabic↔Latin transliteration, recent products on top
6. **Auto-dark cashier** — at configurable hour (default 18:00) screen dims to dark theme
7. **Voice-add for catalog** — deferred (vision v2)
8. **Onboarding tour** — in scope (see §6.3)
9. **Keyboard shortcuts panel** — ⌘? opens sheet listing every shortcut
10. **Per-vendor brand color + logo** — vendor uploads logo + picks accent color from a small palette (4–6 options) → applies to receipts, customer-facing shop card. Deferred to H-3.3 unless headroom.

---

## 8. Acceptance criteria

### 8.1 Design system
- Every screen renders without inline `style={{}}` (all components use design-system tokens)
- Components in `apps/pos/src/ui/components/` and `apps/admin/src/ui/components/` exported and reused — no per-screen duplicates
- All animations honor `prefers-reduced-motion`
- All interactive elements have keyboard equivalents + ARIA labels
- Lighthouse accessibility score ≥ 90 on every screen
- Total CSS animation overhead < 1% main-thread time per screen (measured in DevTools Performance)

### 8.2 Responsive
- Every surface in §6 renders correctly at 375px / 768px / 1024px / 1440px viewport widths
- No horizontal scroll at any breakpoint
- Touch targets ≥ 44px on phone breakpoint
- Phone screens use bottom tab bar + FAB pattern

### 8.3 Functional
- Every redesigned surface from H-3 still passes its existing tests (49 pos + 3 admin + integration suite)
- New surfaces have at least one smoke test (component renders without crash + happy-path interaction works)
- Permission middleware checks every mutating admin route
- Audit log row created on every mutation (verified by integration test)
- Receipt designer preview matches what the real ESC/POS printer outputs (byte-for-byte)

### 8.4 Performance
- Cashier ring 1 item: < 500ms (barcode → cart line → done) — same H-2 bar
- Schema form render after category pick: < 100ms
- Dashboard initial load: < 1.5s on broadband
- Custom report preview: < 800ms for 30-day window
- Heatmap render: < 200ms

### 8.5 Acceptance for the schema commitments
- Migrations run cleanly on the pilot DB
- Existing data unaffected (`pos_sale.channel` defaults to `offline` for all historical rows)
- `users.is_super_admin = false` for the pilot owner; flip to `true` for Hanoot ops accounts
- `vendor.commission_rate_bps = 700` seeded by default; super-admin can edit during onboarding
- Audit middleware tested: every mutating route emits exactly one log row per request

---

## 9. Out-of-scope / explicit non-goals

Reiteration to prevent scope creep during implementation:

- ❌ Discount application at register (only promo CRUD/storage)
- ❌ Super-admin operational views (only schema + locked sidebar slot)
- ❌ Per-vendor scoped auth tokens (H-3.1 OPEN #1, separate phase)
- ❌ Picker app changes (Phase J)
- ❌ Customer-facing app changes (already designed 2026-05-21)
- ❌ Voice-add for catalog entry (vision v2)
- ❌ Multi-currency, multi-store, card payments (v2)
- ❌ Tax engine (only display in receipts; calculation deferred)
- ❌ Loyalty / customer CRM beyond profile page (v2)
- ❌ Vendor marketing tools (banners, coupon creation by vendor) (v2)

---

## 10. References

- Brainstorming session: `.superpowers/brainstorm/13239-1779831366/content/` (screens 01–19)
- Live test findings: `docs/superpowers/plans/2026-05-26-phase-h3-1-live-test-fixes.md`
- H-3 plan: `docs/superpowers/plans/2026-05-26-phase-h3-inventory-admin.md`
- Vision doc: `docs/superpowers/specs/2026-05-25-hanoot-platform-vision.md`
- Customer DS: `docs/superpowers/design-pack-2026-05-21/hanoot/design-system.jsx` + primitives.jsx + brand-concepts.jsx

---

## 11. Next step

After user approval of this spec → invoke `writing-plans` skill to produce the implementation plan for Phase H-3.2.
