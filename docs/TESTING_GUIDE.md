# Testing Guide — Every Scenario

This doc walks through every flow you can test on the local stack. Each scenario has steps, expected result, and where to look if something breaks.

## 0. Pre-flight — make sure everything is up

```powershell
# 1. Postgres
$dataDir = "D:\Personal\08_Ecommerce app\ecommerce-mvp\local-pg-data"
& "D:\Programs\PostgreSQL\16\bin\pg_ctl.exe" status -D $dataDir
# Expect: "pg_ctl: server is running"

# 2. Medusa
curl http://localhost:9000/health
# Expect: "OK"

# 3. Storefront
curl -I http://localhost:8000/dk
# Expect: HTTP/1.1 307 then 200 (with cookies)

# 4. Mobile metro
# Run separately: cd mobile && npx expo start
```

If any are down, see "Restart everything" in `docs/morning-summary.md`.

---

## 1. Mobile — customer flow (most important)

### 1.1 First launch / onboarding
1. Install Expo Go on your phone (App Store / Play Store).
2. Make sure phone is on **same Wi-Fi** as laptop.
3. Run `cd mobile && npx expo start`.
4. Scan QR code with Expo Go.
5. **Expected:** onboarding screen with shopping bag emoji and "Start shopping" button.
6. Tap "Start shopping" → lands on the Shop tab.

### 1.2 Browse products
- **Home tab "Shop"** shows hero greeting + search bar + category chips + product grid.
- **Expected categories** (after seed): All, Shirts, Pants, Sweatshirts, Merch, Food, Flowers, Vegetables, Electronics, Fashion (with emojis).
- **Expected products**: 14 total (4 from initial seed + 10 from multi-category).
- Pull down → refresh.
- Tap a category chip → filters to that category.

### 1.3 Search
- Type "rose" → debounce 350ms → shows Red Roses Bouquet.
- Type "headphones" → shows Wireless Headphones.
- Clear search → all products return.

### 1.4 Product details
- Tap any product.
- **Expected:** image, title, price, description, sticky "Add to cart" button.
- Tap "Add to cart" → updates cart store, navigates to Cart tab.

### 1.5 Cart
- Cart tab shows item with quantity controls.
- "+" / "−" updates quantity (calls Medusa cart API).
- "Remove" deletes line item.
- Footer shows total.
- "Checkout" → checkout screen.

### 1.6 Auth — register
- Profile tab → "Create account".
- Fill: first/last name, email, password.
- Submit.
- **Expected:** user logged in, lands on Profile with their name + email + Log out button.
- **API trace:** `POST /auth/customer/emailpass/register` → `POST /store/customers`.

### 1.7 Auth — login
- Log out from Profile.
- Profile → "Log in" → enter credentials → submit.
- **Expected:** authenticated, name shows in Profile.

### 1.8 Checkout (placeholder)
- Cart → Checkout.
- **Expected:** order summary visible.
- "Place order" → currently calls `POST /store/carts/{id}/complete` directly.
- **Will fail** unless a manual payment provider is wired into Medusa Admin → Regions. This is on the TODO list (see `OPTIMIZATIONS_AND_QUESTIONS.md`).

### 1.9 Orders
- Orders tab.
- If logged in: shows order history (empty until you successfully place one).
- If logged out: prompts to log in.

---

## 2. Medusa Admin (super-admin) flow

URL: http://localhost:9000/app
Login: `2ngryprogrammer@gmail.com` / `t5Bz3kJ4TnwhMPYXwaazyr9K`

### 2.1 Product approval workflow
1. **Manually create a product** as admin (Products → Add Product).
2. **Expected:** subscriber `approval-on-product-created` fires → row appears in `product_approval` table with status `approved` (admin-created products auto-approve).
3. Test via API: `curl -H "Authorization: Bearer <token>" http://localhost:9000/admin/approvals?status=approved`
4. To test rejection flow: insert a row manually with `submitted_by_vendor_id` set + status `pending_review`, then call `POST /admin/approvals/{product_id}/approve` or `/reject`.

### 2.2 Tenants (shops)
1. `POST /admin/tenants` with `{ "slug":"acme-flowers", "name":"Acme Flowers", "vertical":"flowers" }`.
2. `GET /admin/tenants` → see your tenant.
3. `GET /store/tenants/acme-flowers` → public view (only fields safe for public consumption).
4. `POST /admin/tenants/{id}` with `{ "approval_status":"approved" }` to approve.

### 2.3 POS module
- `GET /admin/pos` → returns counts + health.
- `POST /admin/pos/sync` body `{ "pos_provider":"noop" }` → returns `{ processed: 0 }`.

### 2.4 AI features
- `POST /admin/ai/describe` body `{ "title":"Red roses bouquet", "bullets":["12 stems","hand-tied"] }`.
  - Without `ANTHROPIC_API_KEY` set → stub provider returns canned copy.
  - With key set → real Claude call (~$0.001 per call).
- `POST /admin/ai/categorize` body `{ "title":"Wireless headphones" }` → returns `{ category_handle: "electronics", ...}`.

### 2.5 Semantic search
- `GET /store/search?q=comfortable+chair` → returns products ranked by embedding similarity (falls back to keyword if no embeddings yet).
- Run the seed again to trigger `ai-index-on-product-change` subscriber to populate embeddings.

---

## 3. Storefront (web) flow

URL: http://localhost:8000/dk

### 3.1 Browse
1. Open in browser.
2. **Expected:** Medusa default storefront with hero + product carousel.
3. Click a product → details page loads.
4. Add to cart → cart updates.

### 3.2 Auth
- Account → register → login flow (Medusa starter's built-in pages).

### 3.3 Checkout
- Same caveat as mobile — needs payment provider configured.

---

## 4. Vendor API (manual cURL — vendor portal UI is on the TODO)

Replace `<USER_ID>` with a Medusa user id you've onboarded as a vendor.

```bash
# Set up: create a tenant + insert a vendor row pointing at a user
curl -X POST http://localhost:9000/admin/tenants \
  -H "Content-Type: application/json" \
  -d '{"slug":"test-shop","name":"Test Shop","vertical":"food"}'
# Note the tenant.id from response

# Insert vendor row directly in DB (no admin route for vendor onboarding yet — TODO)
psql -U medusa -h localhost -p 5433 -d medusa_db -c \
  "INSERT INTO vendor (id, user_id, tenant_id, email, role, is_active) VALUES (gen_random_uuid()::text, '<USER_ID>', '<TENANT_ID>', 'vendor@test.com', 'owner', true);"

# Now call vendor API as that user
curl http://localhost:9000/vendor/me -H "x-vendor-user-id: <USER_ID>"
# Expected: { vendor, tenant, vertical_template: {...food fields...} }

# List products in the vendor's shop
curl http://localhost:9000/vendor/products -H "x-vendor-user-id: <USER_ID>"

# Create a product (auto-scoped to vendor's sales channel — will be empty until tenant.sales_channel_id is set)
curl -X POST http://localhost:9000/vendor/products \
  -H "x-vendor-user-id: <USER_ID>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Pepperoni pizza","vertical_fields":{"prep_minutes":15,"spice_level":"mild"}}'
```

---

## 5. Delivery module

```bash
# Create a delivery zone for a tenant
# (use admin SQL for now since admin route isn't built)
psql -U medusa -h localhost -p 5433 -d medusa_db -c \
  "INSERT INTO delivery_zone (id, tenant_id, name, center_lat, center_lng, radius_km, delivery_fee_cents, is_active) \
   VALUES (gen_random_uuid()::text, '<TENANT_ID>', 'Hamra', 33.8938, 35.5018, 5, 500, true);"

# Create a delivery window
psql -U medusa -h localhost -p 5433 -d medusa_db -c \
  "INSERT INTO delivery_window (id, tenant_id, day_of_week, start_minutes, end_minutes, capacity, is_active) \
   VALUES (gen_random_uuid()::text, '<TENANT_ID>', 1, 540, 720, 20, true);"

# Check available slots
curl "http://localhost:9000/store/delivery/slots?tenant_id=<TENANT_ID>&days=7"

# Check if address is in delivery zone
curl -X POST http://localhost:9000/store/delivery/check-address \
  -H "Content-Type: application/json" \
  -d '{"tenant_id":"<TENANT_ID>","lat":33.8938,"lng":35.5018}'
```

---

## 6. Notifications

```bash
# Register a fake push token
curl -X POST http://localhost:9000/store/notifications/push-token \
  -H "Content-Type: application/json" \
  -d '{"user_id":"cust_fake","token":"ExponentPushToken[xxx]","platform":"expo"}'

# List inbox (will be empty until a notification subscriber fires)
curl "http://localhost:9000/store/notifications?user_id=cust_fake"
```

Trigger a notification: place an order in the mobile app — the `notify-on-order-events` subscriber will create an inbox entry for the customer + any vendor whose shop the order belongs to.

---

## 7. Wallet

```bash
# Top up
curl -X POST http://localhost:9000/store/wallet/topup \
  -H "Content-Type: application/json" \
  -d '{"customer_id":"cust_X","amount_cents":2000,"currency":"usd"}'

# Check balance
curl "http://localhost:9000/store/wallet?customer_id=cust_X"
```

---

## 8. Loyalty + referrals

```bash
# Read my points (auto-creates account on first read)
curl "http://localhost:9000/store/loyalty?customer_id=cust_A"
# Expected: { points: 0, tier: "bronze", referral_code: "REFXXXXXX" }

# Apply a friend's referral code at signup
curl -X POST http://localhost:9000/store/loyalty/refer \
  -H "Content-Type: application/json" \
  -d '{"customer_id":"cust_B","referral_code":"REFXXXXXX"}'
# Expected: { referral: {...} } + cust_B's wallet now has 200 welcome bonus points

# Place an order as cust_B → subscriber awards points + fulfills referral
```

---

## 9. Reviews

```bash
# Submit a product review (after authentication)
curl -X POST http://localhost:9000/store/reviews/products/<PRODUCT_ID> \
  -H "Content-Type: application/json" \
  -d '{"customer_id":"cust_X","rating":5,"title":"Loved it","body":"Fresh!"}'

# Get reviews + stats
curl http://localhost:9000/store/reviews/products/<PRODUCT_ID>
# Expected: { reviews: [...], stats: { average: 5.00, count: 1, distribution: { 5: 1, ... } } }
```

---

## 10. Addresses

```bash
# Save an address
curl -X POST http://localhost:9000/store/addresses \
  -H "Content-Type: application/json" \
  -d '{"customer_id":"cust_X","label":"Home","street":"Hamra St","city":"Beirut","country_code":"lb","lat":33.8938,"lng":35.5018}'

# List
curl "http://localhost:9000/store/addresses?customer_id=cust_X"

# Set default
curl -X POST http://localhost:9000/store/addresses/<ADDRESS_ID> \
  -H "Content-Type: application/json" \
  -d '{"customer_id":"cust_X","set_default":true}'
```

---

## 11. Database sanity checks

```sql
-- All custom tables
\dt

-- See how many products per category
SELECT pc.name, COUNT(p.id)
FROM product_category pc
LEFT JOIN product_category_product pcp ON pcp.product_category_id = pc.id
LEFT JOIN product p ON p.id = pcp.product_id
GROUP BY pc.name ORDER BY count DESC;

-- Approval state breakdown
SELECT approval_status, COUNT(*) FROM product_approval GROUP BY approval_status;

-- Loyalty ledger
SELECT * FROM loyalty_event ORDER BY created_at DESC LIMIT 20;
```

Connect with: `psql -U medusa -h localhost -p 5433 -d medusa_db`

---

## 12. End-to-end happy path (everything wired)

This is the goal. Steps:

1. **Customer signs up via mobile** → registers, lands on Profile.
2. **Customer applies a referral code** (manual API call for now) → gets 200 welcome points.
3. **Customer adds 3 products to cart** in the mobile app.
4. **Customer goes to Checkout** → places order.
5. **Order is placed** — subscribers fire:
   - `loyalty-on-order-placed` → awards points based on order total, fulfills any pending referral
   - `notify-on-order-events` → creates in-app inbox entry for customer ("Order placed 🎉")
   - `pos-order-export` → pushes to noop POS (logs an entry in `order_export_log`)
   - `notify-on-order-events` → notifies vendor of the relevant tenant
6. **Customer sees inbox notification** via `GET /store/notifications`.
7. **Customer reviews the products** they bought via `POST /store/reviews/products/{id}`.
8. **Customer's loyalty balance** updates: `GET /store/loyalty`.

This is the InstaShop-style full loop, end-to-end.

---

## 13. What WILL fail (known TODOs)

- **Checkout completion** — needs manual payment provider in Medusa Admin → Regions. Quick fix: add the "manual" payment provider in the region config.
- **Google/Facebook OAuth** — buttons in mobile are placeholders.
- **Expo push notifications** to a real device require a real `ExponentPushToken[xxx]` from the Expo client. The notification subscriber will record to in-app inbox even without push tokens.
- **Live order tracking** — not built (TODO: driver app).
- **Vendor portal UI** — backend API works, but no Next.js front-end yet.
- **Delivery slot picker in checkout** — backend has slots; mobile checkout doesn't call them yet.
- **Storefront** has React 19 type warnings (works fine at runtime; `npm run dev` skips strict TS).
