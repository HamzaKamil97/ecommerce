# Vendor API

Scoped CRUD for vendor (shop-owner) users. Each authenticated vendor only sees & modifies the data belonging to their tenant's sales channel.

## Routes

| Verb | Path | Purpose |
|---|---|---|
| GET | `/vendor/me` | Authenticated vendor profile + their tenant + their vertical template |
| GET | `/vendor/products` | List products in this vendor's sales channel (with approval + vertical_fields) |
| POST | `/vendor/products` | Create product (auto-assigned to tenant's sales channel, marked draft) |
| GET | `/vendor/products/{id}` | Retrieve own product |
| POST | `/vendor/products/{id}` | Update own product (incl. vertical_fields) |
| DELETE | `/vendor/products/{id}` | Delete own product |
| POST | `/vendor/products/{id}/submit` | Submit product for reviewer approval |
| GET | `/vendor/orders` | Orders for this vendor's sales channel |

## Auth — placeholder

For MVP, the vendor's user id is read from header `x-vendor-user-id`. Replace with real auth middleware that reads the JWT before exposing to the public internet.

A proper auth flow:
1. Vendor logs in via `POST /auth/user/emailpass` → gets JWT.
2. Middleware in `apps/backend/src/middlewares.ts` matches `/vendor/*` and:
   - Validates JWT
   - Looks up `Vendor` row by `user_id`
   - Rejects if not a vendor / vendor inactive / tenant suspended
   - Attaches `req.scope.locals.vendor` and `req.scope.locals.tenant`

## Front-end consumption

The vendor portal (`apps/vendor` Next.js — TODO) renders the product-create form by GET'ing `/vendor/me` first → reads `vertical_template.fields` → builds dynamic form. On submit, POSTs to `/vendor/products` with `vertical_fields` in the body.
