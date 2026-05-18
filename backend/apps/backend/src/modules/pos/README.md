# POS Integration Module

Vendor-agnostic scaffold for syncing inventory and orders between Medusa and an external Point-of-Sale / ERP / local inventory system.

## Files

- `index.ts` — module registration
- `service.ts` — orchestration: adapter registry, inventory pull, order push, logging
- `models/sku-mapping.ts` — Medusa variant ↔ POS record link
- `models/inventory-sync-log.ts` — audit trail for inventory changes
- `models/order-export-log.ts` — audit trail for orders pushed to POS
- `adapters/types.ts` — `PosAdapter` interface every adapter must implement
- `adapters/noop.ts` — no-op adapter (safe default; does nothing successfully)

## Adding a real POS

1. Create `adapters/<vendor>.ts` (e.g. `adapters/square.ts`).
2. Implement the `PosAdapter` interface — at minimum `fetchInventory`, `pushOrder`, `resolveBySku`, `ping`.
3. Register it in `service.ts` constructor (`this.registerAdapter(new SquareAdapter(env))`).
4. Add credentials to env (e.g. `SQUARE_ACCESS_TOKEN`).

## Register the module

Add to `medusa-config.ts`:

```ts
modules: [
  // ...
  { resolve: "./src/modules/pos" }
]
```

Then run:

```bash
npx medusa db:migrate
```

The migration is auto-generated from the `model.define(...)` declarations.

## Trigger inventory sync (manual)

```bash
curl -X POST https://<backend>/admin/pos/sync-inventory \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"pos_provider":"noop"}'
```

## Trigger order export (manual)

Wired automatically via the `pos-order-export` subscriber on `order.placed`. Override that subscriber to skip per-tenant if needed.
