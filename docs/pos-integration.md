# POS / ERP Integration — Future Design

Phase 6. Not in MVP. Build clean SKU + order flow first.

## Direction choice

**Model A — POS is source of truth** (recommended for shops with existing POS):
- POS owns inventory quantity.
- Medusa pulls stock from POS on a schedule + webhook.
- Medusa pushes online orders to POS.
- POS confirms fulfillment.

**Model B — Ecommerce is source of truth**:
- Medusa owns products + inventory.
- POS reads from Medusa.
- Offline sales reduce Medusa stock via POS callback.

## SKU mapping table

```ts
medusa_variant_id  uuid PK
sku                text UNIQUE
pos_product_id     text?
pos_variant_id     text?
updated_at         timestamptz
```

## Inventory sync log

```ts
id              uuid
source          enum  -- 'pos' | 'medusa'
sku             text
old_quantity    int
new_quantity    int
status          enum  -- 'success' | 'failed' | 'retry'
error_message   text?
created_at      timestamptz
```

## Order export log

```ts
id              uuid
medusa_order_id uuid
pos_order_id    text?
status          enum  -- 'pending' | 'success' | 'failed'
error_message   text?
attempts        int
created_at      timestamptz
```

## Operational requirements

- Retry failed syncs with exponential backoff.
- Idempotent push (use `medusa_order_id` as idempotency key on POS side).
- Admin UI to surface failed syncs + manual retry.
- Pause sync per-SKU on conflict.
