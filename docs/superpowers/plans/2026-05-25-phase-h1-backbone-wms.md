# Phase H-1 (Backbone-WMS) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Warehouse Management Service inside the Medusa v2 backend — the single source of truth for stock across all Hanoot channels (PoS sale, customer order, picker confirm, manual edit).

**Architecture:** A new `wms/` module in the Medusa monolith owns four tables (stock pools, reservations, movements, shop locations) and exposes a service interface. Atomic stock updates use Postgres row-level locking. Reservations have lazy + scheduled expiry (15-min TTL). The module emits domain events for cross-module consumers (`wms.stock.decremented`, `wms.reservation.created`, etc.). All cross-module callers use the service interface, never direct DB joins — keeping the module splittable into a microservice later.

**Tech Stack:** Medusa v2, Node 22+, TypeScript, Postgres 15+ with Haversine SQL for geo, Jest for integration tests, Knex for migrations, Medusa event bus (in-process EventEmitter for v1).

**Vision doc reference:** `docs/superpowers/specs/2026-05-25-hanoot-platform-vision.md` sections 2 (Architecture) + 4 (v1 scope) + 5 (Phase H-1 row) + 6 (Iraq risks).

---

## Pre-flight (Task 0)

### Task 0: Verify backend structure + dependencies

**Files (read-only):**
- Check: `backend/apps/backend/package.json`
- Check: `backend/apps/backend/medusa-config.ts` (or `.js`)
- Check: `backend/apps/backend/src/modules/` (existing modules)

- [ ] **Step 1: Confirm Medusa v2 + dependencies present**

Run: `cd backend/apps/api && cat package.json | grep -E "@medusajs|knex|jest"`

Expected output includes:
```
"@medusajs/medusa": "^2.x",
"@medusajs/framework": "^2.x",
"knex": "^3.x"
```

If any are missing or the version is wrong, STOP and flag to the user.

- [ ] **Step 2: List existing modules**

Run: `ls backend/apps/backend/src/modules/`

Expected: at least `catalog/` or similar e-commerce modules. Note them — Task 12 (events) will reference these.

- [ ] **Step 3: Confirm Postgres is reachable locally**

Run: `cd backend/apps/api && npx medusa db:setup`

Expected: "Database ready" or migrations succeed.

If Docker compose for Postgres isn't running, start it: `docker compose -f deploy/docker-compose.local.yml up -d postgres`.

- [ ] **Step 4: Confirm test setup works**

Run: `cd backend/apps/api && npx jest --listTests --testPathPattern='integration-tests'`

Expected: lists test files (or shows "no tests" — that's fine, we'll add them).

- [ ] **Step 5: Commit nothing (this is verification only)**

If everything passes, proceed to Task 1. If not, fix the foundation first.

---

## Task 1: Scaffold the WMS module

**Files:**
- Create: `backend/apps/backend/src/modules/wms/index.ts`
- Create: `backend/apps/backend/src/modules/wms/service.ts`
- Create: `backend/apps/backend/src/modules/wms/types.ts`
- Modify: `backend/apps/backend/medusa-config.ts`

- [ ] **Step 1: Write the failing test**

Create: `backend/apps/backend/integration-tests/wms/module-loads.spec.ts`

```ts
import { MedusaContainer } from '@medusajs/types';
import { medusaIntegrationTestRunner } from '@medusajs/test-utils';

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    describe('WMS module', () => {
      let container: MedusaContainer;
      beforeAll(() => { container = getContainer(); });

      it('resolves wmsService from the container', () => {
        const svc = container.resolve('wmsService');
        expect(svc).toBeDefined();
        expect(typeof svc.ping).toBe('function');
      });

      it('ping returns "wms-ok"', async () => {
        const svc = container.resolve('wmsService') as { ping: () => string };
        expect(svc.ping()).toBe('wms-ok');
      });
    });
  },
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend/apps/api && npx jest integration-tests/wms/module-loads.spec.ts`
Expected: FAIL with "wmsService not registered" or similar.

- [ ] **Step 3: Create the module skeleton**

Create `backend/apps/backend/src/modules/wms/types.ts`:
```ts
export type WmsServiceInterface = {
  ping(): string;
};
```

Create `backend/apps/backend/src/modules/wms/service.ts`:
```ts
import { WmsServiceInterface } from './types';

export class WmsService implements WmsServiceInterface {
  ping(): string {
    return 'wms-ok';
  }
}
```

Create `backend/apps/backend/src/modules/wms/index.ts`:
```ts
import { Module } from '@medusajs/framework/utils';
import { WmsService } from './service';

export const WMS_MODULE = 'wms';

export default Module(WMS_MODULE, {
  service: WmsService,
});
```

- [ ] **Step 4: Register the module in medusa-config.ts**

Modify `backend/apps/backend/medusa-config.ts` — add to the `modules` array:
```ts
modules: [
  // ...existing modules
  {
    resolve: './src/modules/wms',
  },
],
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend/apps/api && npx jest integration-tests/wms/module-loads.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/apps/backend/src/modules/wms backend/apps/backend/medusa-config.ts backend/apps/backend/integration-tests/wms/module-loads.spec.ts
git commit -m "feat(wms): scaffold WMS module with health check"
```

---

## Task 2: Stock pool model + migration

**Files:**
- Create: `backend/apps/backend/src/modules/wms/models/stock-pool.model.ts`
- Create: `backend/apps/backend/src/modules/wms/migrations/Migration20260525000001.ts`

- [ ] **Step 1: Write the failing test**

Create: `backend/apps/backend/integration-tests/wms/stock-pool-model.spec.ts`

```ts
import { medusaIntegrationTestRunner } from '@medusajs/test-utils';

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    describe('StockPool model', () => {
      it('persists a stock pool row with vendor_id + variant_id unique constraint', async () => {
        const container = getContainer();
        const manager = container.resolve('manager');
        await manager.transactional(async (tx: any) => {
          await tx.query(`
            INSERT INTO wms_stock_pool (id, vendor_id, variant_id, on_hand_qty, reserved_qty)
            VALUES ('sp_1', 'vendor_a', 'variant_x', 100, 0)
          `);
          const rows = await tx.query(`SELECT * FROM wms_stock_pool WHERE id = 'sp_1'`);
          expect(rows.length).toBe(1);
          expect(rows[0].on_hand_qty).toBe('100');
          expect(rows[0].reserved_qty).toBe('0');
        });
      });

      it('rejects duplicate (vendor_id, variant_id) pair', async () => {
        const container = getContainer();
        const manager = container.resolve('manager');
        await expect(manager.transactional(async (tx: any) => {
          await tx.query(`INSERT INTO wms_stock_pool (id, vendor_id, variant_id, on_hand_qty, reserved_qty) VALUES ('sp_2','v_b','var_y',50,0)`);
          await tx.query(`INSERT INTO wms_stock_pool (id, vendor_id, variant_id, on_hand_qty, reserved_qty) VALUES ('sp_3','v_b','var_y',60,0)`);
        })).rejects.toThrow(/unique/i);
      });
    });
  },
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend/apps/api && npx jest integration-tests/wms/stock-pool-model.spec.ts`
Expected: FAIL — "relation wms_stock_pool does not exist".

- [ ] **Step 3: Create the model**

Create `backend/apps/backend/src/modules/wms/models/stock-pool.model.ts`:
```ts
import { model } from '@medusajs/framework/utils';

export const StockPool = model.define('wms_stock_pool', {
  id: model.id({ prefix: 'sp' }).primaryKey(),
  vendor_id: model.text().searchable(),
  variant_id: model.text().searchable(),
  on_hand_qty: model.bigNumber().default(0),
  reserved_qty: model.bigNumber().default(0),
  last_movement_at: model.dateTime().nullable(),
  created_at: model.dateTime().default(() => new Date()),
  updated_at: model.dateTime().default(() => new Date()),
}).indexes([
  {
    name: 'uniq_pool_per_vendor_variant',
    on: ['vendor_id', 'variant_id'],
    unique: true,
  },
]);
```

- [ ] **Step 4: Create the migration**

Create `backend/apps/backend/src/modules/wms/migrations/Migration20260525000001.ts`:
```ts
import { Migration } from '@mikro-orm/migrations';

export class Migration20260525000001 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS wms_stock_pool (
        id            TEXT PRIMARY KEY,
        vendor_id     TEXT NOT NULL,
        variant_id    TEXT NOT NULL,
        on_hand_qty   NUMERIC(20,4) NOT NULL DEFAULT 0,
        reserved_qty  NUMERIC(20,4) NOT NULL DEFAULT 0,
        last_movement_at TIMESTAMPTZ,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE UNIQUE INDEX uniq_pool_per_vendor_variant
        ON wms_stock_pool (vendor_id, variant_id);
      CREATE INDEX idx_pool_vendor ON wms_stock_pool (vendor_id);
    `);
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS wms_stock_pool;`);
  }
}
```

- [ ] **Step 5: Register the model with the module**

Modify `backend/apps/backend/src/modules/wms/index.ts`:
```ts
import { Module } from '@medusajs/framework/utils';
import { WmsService } from './service';
import { StockPool } from './models/stock-pool.model';

export const WMS_MODULE = 'wms';

export default Module(WMS_MODULE, {
  service: WmsService,
  models: [StockPool],
});
```

- [ ] **Step 6: Run migration + test**

Run: `cd backend/apps/api && npx medusa db:migrate && npx jest integration-tests/wms/stock-pool-model.spec.ts`
Expected: PASS for both inserts; second test PASS (duplicate rejected).

- [ ] **Step 7: Commit**

```bash
git add backend/apps/backend/src/modules/wms backend/apps/backend/integration-tests/wms/stock-pool-model.spec.ts
git commit -m "feat(wms): add stock pool model + migration with uniqueness on (vendor,variant)"
```

---

## Task 3: Stock pool repository + service.getStock()

**Files:**
- Create: `backend/apps/backend/src/modules/wms/repositories/stock-pool.repository.ts`
- Modify: `backend/apps/backend/src/modules/wms/service.ts`
- Modify: `backend/apps/backend/src/modules/wms/types.ts`

- [ ] **Step 1: Write the failing test**

Create: `backend/apps/backend/integration-tests/wms/get-stock.spec.ts`

```ts
import { medusaIntegrationTestRunner } from '@medusajs/test-utils';

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    describe('WmsService.getStock', () => {
      it('returns 0/0 when no pool row exists', async () => {
        const svc = getContainer().resolve('wmsService');
        const result = await svc.getStock('v_none', 'var_none');
        expect(result.on_hand).toBe(0);
        expect(result.reserved).toBe(0);
        expect(result.available).toBe(0);
      });

      it('returns on_hand, reserved, available = on_hand - reserved when pool exists', async () => {
        const container = getContainer();
        const manager = container.resolve('manager');
        await manager.transactional(async (tx: any) => {
          await tx.query(`INSERT INTO wms_stock_pool (id, vendor_id, variant_id, on_hand_qty, reserved_qty) VALUES ('sp_t3','v_t3','var_t3',100,15)`);
        });
        const svc = container.resolve('wmsService');
        const result = await svc.getStock('v_t3', 'var_t3');
        expect(result.on_hand).toBe(100);
        expect(result.reserved).toBe(15);
        expect(result.available).toBe(85);
      });
    });
  },
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend/apps/api && npx jest integration-tests/wms/get-stock.spec.ts`
Expected: FAIL — "svc.getStock is not a function".

- [ ] **Step 3: Add types**

Modify `backend/apps/backend/src/modules/wms/types.ts`:
```ts
export type StockSnapshot = {
  on_hand: number;
  reserved: number;
  available: number;
};

export type WmsServiceInterface = {
  ping(): string;
  getStock(vendorId: string, variantId: string): Promise<StockSnapshot>;
};
```

- [ ] **Step 4: Create the repository**

Create `backend/apps/backend/src/modules/wms/repositories/stock-pool.repository.ts`:
```ts
import { EntityManager } from '@mikro-orm/postgresql';

export class StockPoolRepository {
  constructor(private readonly em: EntityManager) {}

  async findByVendorVariant(vendorId: string, variantId: string): Promise<{ on_hand_qty: number; reserved_qty: number } | null> {
    const rows: any[] = await this.em.execute(
      `SELECT on_hand_qty::numeric AS on_hand_qty, reserved_qty::numeric AS reserved_qty
       FROM wms_stock_pool WHERE vendor_id = ? AND variant_id = ? LIMIT 1`,
      [vendorId, variantId],
    );
    if (rows.length === 0) return null;
    return {
      on_hand_qty: Number(rows[0].on_hand_qty),
      reserved_qty: Number(rows[0].reserved_qty),
    };
  }
}
```

- [ ] **Step 5: Wire repository into service**

Modify `backend/apps/backend/src/modules/wms/service.ts`:
```ts
import { MedusaService } from '@medusajs/framework/utils';
import { EntityManager } from '@mikro-orm/postgresql';
import { StockPool } from './models/stock-pool.model';
import { StockPoolRepository } from './repositories/stock-pool.repository';
import { StockSnapshot, WmsServiceInterface } from './types';

export class WmsService extends MedusaService({ StockPool }) implements WmsServiceInterface {
  private get pools(): StockPoolRepository {
    const em = this.container_.resolve<EntityManager>('manager');
    return new StockPoolRepository(em);
  }

  ping(): string { return 'wms-ok'; }

  async getStock(vendorId: string, variantId: string): Promise<StockSnapshot> {
    const row = await this.pools.findByVendorVariant(vendorId, variantId);
    if (!row) return { on_hand: 0, reserved: 0, available: 0 };
    return {
      on_hand: row.on_hand_qty,
      reserved: row.reserved_qty,
      available: row.on_hand_qty - row.reserved_qty,
    };
  }
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd backend/apps/api && npx jest integration-tests/wms/get-stock.spec.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/apps/backend/src/modules/wms backend/apps/backend/integration-tests/wms/get-stock.spec.ts
git commit -m "feat(wms): WmsService.getStock returns on_hand / reserved / available"
```

---

## Task 4: Movement model + migration (audit log)

**Files:**
- Create: `backend/apps/backend/src/modules/wms/models/movement.model.ts`
- Create: `backend/apps/backend/src/modules/wms/migrations/Migration20260525000002.ts`

- [ ] **Step 1: Write the failing test**

Create: `backend/apps/backend/integration-tests/wms/movement-model.spec.ts`

```ts
import { medusaIntegrationTestRunner } from '@medusajs/test-utils';

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    describe('Movement model', () => {
      it('stores a movement row with required columns', async () => {
        const container = getContainer();
        const manager = container.resolve('manager');
        await manager.transactional(async (tx: any) => {
          await tx.query(`
            INSERT INTO wms_movement (id, vendor_id, variant_id, type, qty_delta, source_id, actor_id)
            VALUES ('mv_1','v_a','var_x','sale',-1,'order_1','cashier_42')
          `);
          const rows = await tx.query(`SELECT * FROM wms_movement WHERE id = 'mv_1'`);
          expect(rows[0].type).toBe('sale');
          expect(Number(rows[0].qty_delta)).toBe(-1);
        });
      });
    });
  },
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend/apps/api && npx jest integration-tests/wms/movement-model.spec.ts`
Expected: FAIL — "relation wms_movement does not exist".

- [ ] **Step 3: Create the model**

Create `backend/apps/backend/src/modules/wms/models/movement.model.ts`:
```ts
import { model } from '@medusajs/framework/utils';

export const MOVEMENT_TYPES = ['sale', 'pick', 'manual', 'restock', 'adjustment', 'release'] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

export const Movement = model.define('wms_movement', {
  id: model.id({ prefix: 'mv' }).primaryKey(),
  vendor_id: model.text().searchable(),
  variant_id: model.text().searchable(),
  type: model.enum(MOVEMENT_TYPES),
  qty_delta: model.bigNumber(),
  source_id: model.text().nullable(),    // order_id / sale_id / null for manual
  actor_id: model.text().nullable(),     // cashier_id / picker_id / vendor_owner_id
  note: model.text().nullable(),
  created_at: model.dateTime().default(() => new Date()),
});
```

- [ ] **Step 4: Create the migration**

Create `backend/apps/backend/src/modules/wms/migrations/Migration20260525000002.ts`:
```ts
import { Migration } from '@mikro-orm/migrations';

export class Migration20260525000002 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS wms_movement (
        id          TEXT PRIMARY KEY,
        vendor_id   TEXT NOT NULL,
        variant_id  TEXT NOT NULL,
        type        TEXT NOT NULL CHECK (type IN ('sale','pick','manual','restock','adjustment','release')),
        qty_delta   NUMERIC(20,4) NOT NULL,
        source_id   TEXT,
        actor_id    TEXT,
        note        TEXT,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX idx_mv_vendor_created ON wms_movement (vendor_id, created_at DESC);
      CREATE INDEX idx_mv_vendor_variant ON wms_movement (vendor_id, variant_id, created_at DESC);
    `);
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS wms_movement;`);
  }
}
```

- [ ] **Step 5: Register the Movement model**

Modify `backend/apps/backend/src/modules/wms/index.ts`:
```ts
import { Module } from '@medusajs/framework/utils';
import { WmsService } from './service';
import { StockPool } from './models/stock-pool.model';
import { Movement } from './models/movement.model';

export const WMS_MODULE = 'wms';

export default Module(WMS_MODULE, {
  service: WmsService,
  models: [StockPool, Movement],
});
```

- [ ] **Step 6: Run migration + test**

Run: `cd backend/apps/api && npx medusa db:migrate && npx jest integration-tests/wms/movement-model.spec.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/apps/backend/src/modules/wms backend/apps/backend/integration-tests/wms/movement-model.spec.ts
git commit -m "feat(wms): movement audit log model + migration"
```

---

## Task 5: Atomic decrement (the heart of WMS)

**Files:**
- Modify: `backend/apps/backend/src/modules/wms/repositories/stock-pool.repository.ts`
- Modify: `backend/apps/backend/src/modules/wms/service.ts`
- Modify: `backend/apps/backend/src/modules/wms/types.ts`
- Create: `backend/apps/backend/src/modules/wms/errors.ts`

- [ ] **Step 1: Write the failing test**

Create: `backend/apps/backend/integration-tests/wms/decrement.spec.ts`

```ts
import { medusaIntegrationTestRunner } from '@medusajs/test-utils';

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    describe('WmsService.decrementStock', () => {
      const seed = async (container: any, vendor: string, variant: string, onHand: number) => {
        const m = container.resolve('manager');
        await m.transactional(async (tx: any) => {
          await tx.query(
            `INSERT INTO wms_stock_pool (id, vendor_id, variant_id, on_hand_qty, reserved_qty)
             VALUES (gen_random_uuid()::text, ?, ?, ?, 0)`,
            [vendor, variant, onHand],
          );
        });
      };

      it('decrements on_hand by qty and writes a movement row', async () => {
        const c = getContainer();
        await seed(c, 'v_dec', 'var_a', 50);
        const svc = c.resolve('wmsService');
        const result = await svc.decrementStock({
          vendor_id: 'v_dec',
          variant_id: 'var_a',
          qty: 3,
          type: 'sale',
          source_id: 'order_1',
          actor_id: 'cashier_1',
        });
        expect(result.new_on_hand).toBe(47);
        const after = await svc.getStock('v_dec', 'var_a');
        expect(after.on_hand).toBe(47);
        // Movement audit row exists
        const m = c.resolve('manager');
        const rows = await m.transactional((tx: any) => tx.query(
          `SELECT * FROM wms_movement WHERE source_id = 'order_1'`,
        ));
        expect(rows.length).toBe(1);
        expect(Number(rows[0].qty_delta)).toBe(-3);
      });

      it('throws WmsInsufficientStockError when qty > available', async () => {
        const c = getContainer();
        await seed(c, 'v_dec2', 'var_b', 5);
        const svc = c.resolve('wmsService');
        await expect(svc.decrementStock({
          vendor_id: 'v_dec2', variant_id: 'var_b', qty: 10, type: 'sale',
        })).rejects.toThrow(/insufficient/i);
      });

      it('creates an implicit pool with on_hand=0 if missing, then rejects qty>0', async () => {
        const svc = getContainer().resolve('wmsService');
        await expect(svc.decrementStock({
          vendor_id: 'v_dec3', variant_id: 'var_new', qty: 1, type: 'sale',
        })).rejects.toThrow(/insufficient/i);
      });
    });
  },
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend/apps/api && npx jest integration-tests/wms/decrement.spec.ts`
Expected: FAIL — "decrementStock is not a function".

- [ ] **Step 3: Define errors**

Create `backend/apps/backend/src/modules/wms/errors.ts`:
```ts
export class WmsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WmsError';
  }
}

export class WmsInsufficientStockError extends WmsError {
  constructor(public readonly vendor_id: string, public readonly variant_id: string, public readonly requested: number, public readonly available: number) {
    super(`Insufficient stock: vendor=${vendor_id} variant=${variant_id} requested=${requested} available=${available}`);
    this.name = 'WmsInsufficientStockError';
  }
}
```

- [ ] **Step 4: Extend types**

Modify `backend/apps/backend/src/modules/wms/types.ts`:
```ts
import type { MovementType } from './models/movement.model';

export type StockSnapshot = {
  on_hand: number;
  reserved: number;
  available: number;
};

export type DecrementStockInput = {
  vendor_id: string;
  variant_id: string;
  qty: number;
  type: MovementType;
  source_id?: string;
  actor_id?: string;
  note?: string;
};

export type DecrementStockResult = {
  new_on_hand: number;
  movement_id: string;
};

export type WmsServiceInterface = {
  ping(): string;
  getStock(vendorId: string, variantId: string): Promise<StockSnapshot>;
  decrementStock(input: DecrementStockInput): Promise<DecrementStockResult>;
};
```

- [ ] **Step 5: Implement atomic decrement in repository**

Modify `backend/apps/backend/src/modules/wms/repositories/stock-pool.repository.ts` — add method:
```ts
import { randomUUID } from 'crypto';

// ... (existing class) ...

  async atomicDecrement(
    vendorId: string,
    variantId: string,
    qty: number,
  ): Promise<{ new_on_hand: number }> {
    // Row-level lock with FOR UPDATE; insert-or-update pattern.
    // First, ensure a pool row exists (zero stock if absent).
    await this.em.execute(
      `INSERT INTO wms_stock_pool (id, vendor_id, variant_id, on_hand_qty, reserved_qty)
       VALUES (?, ?, ?, 0, 0)
       ON CONFLICT (vendor_id, variant_id) DO NOTHING`,
      [`sp_${randomUUID().slice(0, 12)}`, vendorId, variantId],
    );

    const rows: any[] = await this.em.execute(
      `SELECT on_hand_qty::numeric AS on_hand, reserved_qty::numeric AS reserved
       FROM wms_stock_pool WHERE vendor_id = ? AND variant_id = ? FOR UPDATE`,
      [vendorId, variantId],
    );
    const onHand = Number(rows[0].on_hand);
    const reserved = Number(rows[0].reserved);
    const available = onHand - reserved;
    if (available < qty) {
      throw new Error(`INSUFFICIENT:${available}:${qty}`); // service layer converts to WmsInsufficientStockError
    }
    const newOnHand = onHand - qty;
    await this.em.execute(
      `UPDATE wms_stock_pool
       SET on_hand_qty = ?, last_movement_at = NOW(), updated_at = NOW()
       WHERE vendor_id = ? AND variant_id = ?`,
      [newOnHand, vendorId, variantId],
    );
    return { new_on_hand: newOnHand };
  }
```

- [ ] **Step 6: Implement decrementStock in service**

Modify `backend/apps/backend/src/modules/wms/service.ts` — add method:
```ts
import { randomUUID } from 'crypto';
import { DecrementStockInput, DecrementStockResult } from './types';
import { WmsInsufficientStockError } from './errors';

// ... inside WmsService class ...

  async decrementStock(input: DecrementStockInput): Promise<DecrementStockResult> {
    const em = this.container_.resolve<EntityManager>('manager');
    return await em.transactional(async () => {
      const pools = new StockPoolRepository(em);
      try {
        const { new_on_hand } = await pools.atomicDecrement(input.vendor_id, input.variant_id, input.qty);
        // Audit row
        const movementId = `mv_${randomUUID().slice(0, 12)}`;
        await em.execute(
          `INSERT INTO wms_movement (id, vendor_id, variant_id, type, qty_delta, source_id, actor_id, note)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [movementId, input.vendor_id, input.variant_id, input.type, -input.qty, input.source_id ?? null, input.actor_id ?? null, input.note ?? null],
        );
        return { new_on_hand, movement_id: movementId };
      } catch (e: any) {
        if (typeof e.message === 'string' && e.message.startsWith('INSUFFICIENT:')) {
          const [, availStr, reqStr] = e.message.split(':');
          throw new WmsInsufficientStockError(input.vendor_id, input.variant_id, Number(reqStr), Number(availStr));
        }
        throw e;
      }
    });
  }
```

- [ ] **Step 7: Run test to verify it passes**

Run: `cd backend/apps/api && npx jest integration-tests/wms/decrement.spec.ts`
Expected: PASS all 3 cases.

- [ ] **Step 8: Commit**

```bash
git add backend/apps/backend/src/modules/wms backend/apps/backend/integration-tests/wms/decrement.spec.ts
git commit -m "feat(wms): atomic decrement with row-level lock + insufficient-stock error + movement audit"
```

---

## Task 6: Increment / restock + manual adjustment

**Files:**
- Modify: `backend/apps/backend/src/modules/wms/repositories/stock-pool.repository.ts`
- Modify: `backend/apps/backend/src/modules/wms/service.ts`
- Modify: `backend/apps/backend/src/modules/wms/types.ts`

- [ ] **Step 1: Write the failing test**

Create: `backend/apps/backend/integration-tests/wms/increment.spec.ts`

```ts
import { medusaIntegrationTestRunner } from '@medusajs/test-utils';

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    describe('WmsService.incrementStock', () => {
      it('adds qty to on_hand and logs a restock movement', async () => {
        const c = getContainer();
        const svc = c.resolve('wmsService');
        await svc.incrementStock({
          vendor_id: 'v_inc', variant_id: 'var_inc', qty: 25, type: 'restock', source_id: 'po_99',
        });
        const result = await svc.getStock('v_inc', 'var_inc');
        expect(result.on_hand).toBe(25);
        await svc.incrementStock({
          vendor_id: 'v_inc', variant_id: 'var_inc', qty: 10, type: 'restock', source_id: 'po_100',
        });
        const result2 = await svc.getStock('v_inc', 'var_inc');
        expect(result2.on_hand).toBe(35);
      });

      it('rejects negative qty', async () => {
        const svc = getContainer().resolve('wmsService');
        await expect(svc.incrementStock({
          vendor_id: 'v_x', variant_id: 'var_x', qty: -1, type: 'restock',
        })).rejects.toThrow(/positive/i);
      });
    });
  },
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend/apps/api && npx jest integration-tests/wms/increment.spec.ts`
Expected: FAIL — "incrementStock is not a function".

- [ ] **Step 3: Extend types**

Modify `backend/apps/backend/src/modules/wms/types.ts` — add:
```ts
export type IncrementStockInput = {
  vendor_id: string;
  variant_id: string;
  qty: number; // must be > 0
  type: MovementType; // 'restock' | 'manual' | 'adjustment'
  source_id?: string;
  actor_id?: string;
  note?: string;
};

export type IncrementStockResult = {
  new_on_hand: number;
  movement_id: string;
};

// Add to WmsServiceInterface:
//   incrementStock(input: IncrementStockInput): Promise<IncrementStockResult>;
```

- [ ] **Step 4: Implement repository method**

Modify `backend/apps/backend/src/modules/wms/repositories/stock-pool.repository.ts` — add:
```ts
  async atomicIncrement(vendorId: string, variantId: string, qty: number): Promise<{ new_on_hand: number }> {
    await this.em.execute(
      `INSERT INTO wms_stock_pool (id, vendor_id, variant_id, on_hand_qty, reserved_qty)
       VALUES (?, ?, ?, 0, 0)
       ON CONFLICT (vendor_id, variant_id) DO NOTHING`,
      [`sp_${randomUUID().slice(0, 12)}`, vendorId, variantId],
    );
    const rows: any[] = await this.em.execute(
      `UPDATE wms_stock_pool
       SET on_hand_qty = on_hand_qty + ?, last_movement_at = NOW(), updated_at = NOW()
       WHERE vendor_id = ? AND variant_id = ?
       RETURNING on_hand_qty::numeric AS on_hand`,
      [qty, vendorId, variantId],
    );
    return { new_on_hand: Number(rows[0].on_hand) };
  }
```

- [ ] **Step 5: Implement service method**

Modify `backend/apps/backend/src/modules/wms/service.ts`:
```ts
  async incrementStock(input: IncrementStockInput): Promise<IncrementStockResult> {
    if (input.qty <= 0) throw new Error('qty must be positive');
    const em = this.container_.resolve<EntityManager>('manager');
    return await em.transactional(async () => {
      const pools = new StockPoolRepository(em);
      const { new_on_hand } = await pools.atomicIncrement(input.vendor_id, input.variant_id, input.qty);
      const movementId = `mv_${randomUUID().slice(0, 12)}`;
      await em.execute(
        `INSERT INTO wms_movement (id, vendor_id, variant_id, type, qty_delta, source_id, actor_id, note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [movementId, input.vendor_id, input.variant_id, input.type, input.qty, input.source_id ?? null, input.actor_id ?? null, input.note ?? null],
      );
      return { new_on_hand, movement_id: movementId };
    });
  }
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd backend/apps/api && npx jest integration-tests/wms/increment.spec.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/apps/backend/src/modules/wms backend/apps/backend/integration-tests/wms/increment.spec.ts
git commit -m "feat(wms): incrementStock for restock / manual / adjustment movements"
```

---

## Task 7: Reservation model + migration

**Files:**
- Create: `backend/apps/backend/src/modules/wms/models/reservation.model.ts`
- Create: `backend/apps/backend/src/modules/wms/migrations/Migration20260525000003.ts`

- [ ] **Step 1: Write the failing test**

Create: `backend/apps/backend/integration-tests/wms/reservation-model.spec.ts`

```ts
import { medusaIntegrationTestRunner } from '@medusajs/test-utils';

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    describe('Reservation model', () => {
      it('persists a reservation row with status=active by default', async () => {
        const container = getContainer();
        const m = container.resolve('manager');
        await m.transactional(async (tx: any) => {
          await tx.query(`
            INSERT INTO wms_reservation (id, vendor_id, order_id, variant_id, qty, expires_at)
            VALUES ('rs_1','v_a','order_1','var_x',2, NOW() + INTERVAL '15 minutes')
          `);
          const rows = await tx.query(`SELECT * FROM wms_reservation WHERE id = 'rs_1'`);
          expect(rows[0].status).toBe('active');
          expect(Number(rows[0].qty)).toBe(2);
        });
      });
    });
  },
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend/apps/api && npx jest integration-tests/wms/reservation-model.spec.ts`
Expected: FAIL — "relation wms_reservation does not exist".

- [ ] **Step 3: Create model**

Create `backend/apps/backend/src/modules/wms/models/reservation.model.ts`:
```ts
import { model } from '@medusajs/framework/utils';

export const RESERVATION_STATUSES = ['active', 'consumed', 'released', 'expired'] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export const Reservation = model.define('wms_reservation', {
  id: model.id({ prefix: 'rs' }).primaryKey(),
  vendor_id: model.text().searchable(),
  order_id: model.text().searchable(),
  variant_id: model.text().searchable(),
  qty: model.bigNumber(),
  expires_at: model.dateTime(),
  status: model.enum(RESERVATION_STATUSES).default('active'),
  consumed_at: model.dateTime().nullable(),
  released_at: model.dateTime().nullable(),
  created_at: model.dateTime().default(() => new Date()),
});
```

- [ ] **Step 4: Create migration**

Create `backend/apps/backend/src/modules/wms/migrations/Migration20260525000003.ts`:
```ts
import { Migration } from '@mikro-orm/migrations';

export class Migration20260525000003 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS wms_reservation (
        id           TEXT PRIMARY KEY,
        vendor_id    TEXT NOT NULL,
        order_id     TEXT NOT NULL,
        variant_id   TEXT NOT NULL,
        qty          NUMERIC(20,4) NOT NULL,
        expires_at   TIMESTAMPTZ NOT NULL,
        status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','consumed','released','expired')),
        consumed_at  TIMESTAMPTZ,
        released_at  TIMESTAMPTZ,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX idx_rsv_active_vendor_variant
        ON wms_reservation (vendor_id, variant_id) WHERE status = 'active';
      CREATE INDEX idx_rsv_expires_active
        ON wms_reservation (expires_at) WHERE status = 'active';
      CREATE INDEX idx_rsv_order
        ON wms_reservation (order_id);
    `);
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS wms_reservation;`);
  }
}
```

- [ ] **Step 5: Register model + run migration + test**

Modify `backend/apps/backend/src/modules/wms/index.ts` — add `Reservation` to the `models` array.

Run: `cd backend/apps/api && npx medusa db:migrate && npx jest integration-tests/wms/reservation-model.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/apps/backend/src/modules/wms backend/apps/backend/integration-tests/wms/reservation-model.spec.ts
git commit -m "feat(wms): reservation model + migration with status enum + lazy-expiry indexes"
```

---

## Task 8: createReservation with OOS guard

**Files:**
- Create: `backend/apps/backend/src/modules/wms/repositories/reservation.repository.ts`
- Modify: `backend/apps/backend/src/modules/wms/service.ts`
- Modify: `backend/apps/backend/src/modules/wms/types.ts`
- Modify: `backend/apps/backend/src/modules/wms/errors.ts`

- [ ] **Step 1: Write the failing test**

Create: `backend/apps/backend/integration-tests/wms/create-reservation.spec.ts`

```ts
import { medusaIntegrationTestRunner } from '@medusajs/test-utils';

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    describe('WmsService.createReservation', () => {
      const seed = async (c: any, v: string, var_: string, onHand: number) => {
        const svc = c.resolve('wmsService');
        await svc.incrementStock({ vendor_id: v, variant_id: var_, qty: onHand, type: 'restock' });
      };

      it('creates an active reservation when available stock suffices', async () => {
        const c = getContainer();
        await seed(c, 'v_rsv', 'var_z', 10);
        const svc = c.resolve('wmsService');
        const r = await svc.createReservation({
          vendor_id: 'v_rsv', order_id: 'ord_1', variant_id: 'var_z', qty: 3,
        });
        expect(r.id).toMatch(/^rs_/);
        expect(r.expires_at).toBeInstanceOf(Date);
        const stock = await svc.getStock('v_rsv', 'var_z');
        expect(stock.on_hand).toBe(10);
        expect(stock.reserved).toBe(3);
        expect(stock.available).toBe(7);
      });

      it('rejects when requested qty exceeds available (on_hand - existing reservations)', async () => {
        const c = getContainer();
        await seed(c, 'v_rsv2', 'var_w', 5);
        const svc = c.resolve('wmsService');
        await svc.createReservation({ vendor_id: 'v_rsv2', order_id: 'ord_a', variant_id: 'var_w', qty: 4 });
        await expect(svc.createReservation({
          vendor_id: 'v_rsv2', order_id: 'ord_b', variant_id: 'var_w', qty: 2,
        })).rejects.toThrow(/insufficient/i);
      });

      it('default TTL is 15 minutes', async () => {
        const c = getContainer();
        await seed(c, 'v_ttl', 'var_t', 10);
        const svc = c.resolve('wmsService');
        const before = Date.now();
        const r = await svc.createReservation({
          vendor_id: 'v_ttl', order_id: 'ord_t', variant_id: 'var_t', qty: 1,
        });
        const ttlMs = r.expires_at.getTime() - before;
        expect(ttlMs).toBeGreaterThan(14 * 60_000);
        expect(ttlMs).toBeLessThan(16 * 60_000);
      });
    });
  },
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend/apps/api && npx jest integration-tests/wms/create-reservation.spec.ts`
Expected: FAIL — "createReservation is not a function".

- [ ] **Step 3: Extend types**

Modify `backend/apps/backend/src/modules/wms/types.ts` — add:
```ts
export type CreateReservationInput = {
  vendor_id: string;
  order_id: string;
  variant_id: string;
  qty: number;
  ttl_seconds?: number; // default 900 (15 min)
};

export type Reservation = {
  id: string;
  vendor_id: string;
  order_id: string;
  variant_id: string;
  qty: number;
  expires_at: Date;
  status: 'active' | 'consumed' | 'released' | 'expired';
};

// Add to WmsServiceInterface:
//   createReservation(input: CreateReservationInput): Promise<Reservation>;
```

- [ ] **Step 4: Create reservation repository**

Create `backend/apps/backend/src/modules/wms/repositories/reservation.repository.ts`:
```ts
import { EntityManager } from '@mikro-orm/postgresql';
import { randomUUID } from 'crypto';

export class ReservationRepository {
  constructor(private readonly em: EntityManager) {}

  async sumActiveReserved(vendorId: string, variantId: string): Promise<number> {
    const rows: any[] = await this.em.execute(
      `SELECT COALESCE(SUM(qty::numeric), 0) AS reserved
       FROM wms_reservation
       WHERE vendor_id = ? AND variant_id = ? AND status = 'active' AND expires_at > NOW()`,
      [vendorId, variantId],
    );
    return Number(rows[0].reserved);
  }

  async insertActive(input: {
    vendor_id: string; order_id: string; variant_id: string; qty: number; ttl_seconds: number;
  }): Promise<{ id: string; expires_at: Date }> {
    const id = `rs_${randomUUID().slice(0, 12)}`;
    const rows: any[] = await this.em.execute(
      `INSERT INTO wms_reservation (id, vendor_id, order_id, variant_id, qty, expires_at)
       VALUES (?, ?, ?, ?, ?, NOW() + (? || ' seconds')::interval)
       RETURNING id, expires_at`,
      [id, input.vendor_id, input.order_id, input.variant_id, input.qty, input.ttl_seconds],
    );
    return { id: rows[0].id, expires_at: new Date(rows[0].expires_at) };
  }
}
```

- [ ] **Step 5: Implement service method**

Modify `backend/apps/backend/src/modules/wms/service.ts`:
```ts
import { ReservationRepository } from './repositories/reservation.repository';
import { CreateReservationInput, Reservation as ReservationT } from './types';

  async createReservation(input: CreateReservationInput): Promise<ReservationT> {
    const em = this.container_.resolve<EntityManager>('manager');
    return await em.transactional(async () => {
      // Lock the pool row
      await em.execute(
        `INSERT INTO wms_stock_pool (id, vendor_id, variant_id, on_hand_qty, reserved_qty)
         VALUES (?, ?, ?, 0, 0)
         ON CONFLICT (vendor_id, variant_id) DO NOTHING`,
        [`sp_${randomUUID().slice(0, 12)}`, input.vendor_id, input.variant_id],
      );
      const pRows: any[] = await em.execute(
        `SELECT on_hand_qty::numeric AS on_hand FROM wms_stock_pool
         WHERE vendor_id = ? AND variant_id = ? FOR UPDATE`,
        [input.vendor_id, input.variant_id],
      );
      const onHand = Number(pRows[0].on_hand);
      const reservations = new ReservationRepository(em);
      const existing = await reservations.sumActiveReserved(input.vendor_id, input.variant_id);
      const available = onHand - existing;
      if (available < input.qty) {
        throw new WmsInsufficientStockError(input.vendor_id, input.variant_id, input.qty, available);
      }
      const { id, expires_at } = await reservations.insertActive({
        ...input,
        ttl_seconds: input.ttl_seconds ?? 900,
      });
      // Update denormalized reserved_qty cache on pool
      await em.execute(
        `UPDATE wms_stock_pool SET reserved_qty = reserved_qty + ?, updated_at = NOW()
         WHERE vendor_id = ? AND variant_id = ?`,
        [input.qty, input.vendor_id, input.variant_id],
      );
      return {
        id, vendor_id: input.vendor_id, order_id: input.order_id, variant_id: input.variant_id,
        qty: input.qty, expires_at, status: 'active',
      };
    });
  }
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd backend/apps/api && npx jest integration-tests/wms/create-reservation.spec.ts`
Expected: PASS all 3 cases.

- [ ] **Step 7: Commit**

```bash
git add backend/apps/backend/src/modules/wms backend/apps/backend/integration-tests/wms/create-reservation.spec.ts
git commit -m "feat(wms): createReservation with OOS guard + 15-min TTL"
```

---

## Task 9: consumeReservation + releaseReservation

**Files:**
- Modify: `backend/apps/backend/src/modules/wms/repositories/reservation.repository.ts`
- Modify: `backend/apps/backend/src/modules/wms/service.ts`
- Modify: `backend/apps/backend/src/modules/wms/types.ts`

- [ ] **Step 1: Write the failing test**

Create: `backend/apps/backend/integration-tests/wms/reservation-lifecycle.spec.ts`

```ts
import { medusaIntegrationTestRunner } from '@medusajs/test-utils';

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    describe('Reservation lifecycle', () => {
      const setup = async (c: any) => {
        const svc = c.resolve('wmsService');
        await svc.incrementStock({ vendor_id: 'v_lc', variant_id: 'var_lc', qty: 10, type: 'restock' });
        const r = await svc.createReservation({
          vendor_id: 'v_lc', order_id: 'ord_lc', variant_id: 'var_lc', qty: 3,
        });
        return { svc, reservationId: r.id };
      };

      it('consumeReservation decrements on_hand by qty and marks status=consumed', async () => {
        const c = getContainer();
        const { svc, reservationId } = await setup(c);
        await svc.consumeReservation({ reservation_id: reservationId, actor_id: 'picker_1' });
        const stock = await svc.getStock('v_lc', 'var_lc');
        expect(stock.on_hand).toBe(7);
        expect(stock.reserved).toBe(0);
        expect(stock.available).toBe(7);
      });

      it('releaseReservation restores reserved capacity without touching on_hand', async () => {
        const c = getContainer();
        const { svc, reservationId } = await setup(c);
        await svc.releaseReservation({ reservation_id: reservationId, reason: 'customer_cancel' });
        const stock = await svc.getStock('v_lc', 'var_lc');
        expect(stock.on_hand).toBe(10);
        expect(stock.reserved).toBe(0);
        expect(stock.available).toBe(10);
      });

      it('cannot consume the same reservation twice', async () => {
        const c = getContainer();
        const { svc, reservationId } = await setup(c);
        await svc.consumeReservation({ reservation_id: reservationId });
        await expect(svc.consumeReservation({ reservation_id: reservationId })).rejects.toThrow(/not active/i);
      });
    });
  },
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend/apps/api && npx jest integration-tests/wms/reservation-lifecycle.spec.ts`
Expected: FAIL — "consumeReservation is not a function".

- [ ] **Step 3: Extend types**

Modify `backend/apps/backend/src/modules/wms/types.ts`:
```ts
export type ConsumeReservationInput = {
  reservation_id: string;
  actor_id?: string;
  note?: string;
};

export type ReleaseReservationInput = {
  reservation_id: string;
  reason?: string;
};

// Add to WmsServiceInterface:
//   consumeReservation(input: ConsumeReservationInput): Promise<{ ok: true }>;
//   releaseReservation(input: ReleaseReservationInput): Promise<{ ok: true }>;
```

- [ ] **Step 4: Extend repository**

Modify `backend/apps/backend/src/modules/wms/repositories/reservation.repository.ts` — add:
```ts
  async lockActive(reservationId: string): Promise<{ vendor_id: string; variant_id: string; qty: number; status: string } | null> {
    const rows: any[] = await this.em.execute(
      `SELECT vendor_id, variant_id, qty::numeric AS qty, status FROM wms_reservation
       WHERE id = ? FOR UPDATE`,
      [reservationId],
    );
    if (rows.length === 0) return null;
    return { vendor_id: rows[0].vendor_id, variant_id: rows[0].variant_id, qty: Number(rows[0].qty), status: rows[0].status };
  }

  async markConsumed(reservationId: string): Promise<void> {
    await this.em.execute(
      `UPDATE wms_reservation SET status = 'consumed', consumed_at = NOW() WHERE id = ?`,
      [reservationId],
    );
  }

  async markReleased(reservationId: string): Promise<void> {
    await this.em.execute(
      `UPDATE wms_reservation SET status = 'released', released_at = NOW() WHERE id = ?`,
      [reservationId],
    );
  }
```

- [ ] **Step 5: Implement service methods**

Modify `backend/apps/backend/src/modules/wms/service.ts`:
```ts
import { ConsumeReservationInput, ReleaseReservationInput } from './types';

  async consumeReservation(input: ConsumeReservationInput): Promise<{ ok: true }> {
    const em = this.container_.resolve<EntityManager>('manager');
    return await em.transactional(async () => {
      const reservations = new ReservationRepository(em);
      const r = await reservations.lockActive(input.reservation_id);
      if (!r || r.status !== 'active') throw new Error(`Reservation ${input.reservation_id} not active`);
      // Decrement on_hand
      await em.execute(
        `UPDATE wms_stock_pool
         SET on_hand_qty = on_hand_qty - ?, reserved_qty = reserved_qty - ?, last_movement_at = NOW(), updated_at = NOW()
         WHERE vendor_id = ? AND variant_id = ?`,
        [r.qty, r.qty, r.vendor_id, r.variant_id],
      );
      await reservations.markConsumed(input.reservation_id);
      // Movement audit
      await em.execute(
        `INSERT INTO wms_movement (id, vendor_id, variant_id, type, qty_delta, source_id, actor_id, note)
         VALUES (?, ?, ?, 'pick', ?, ?, ?, ?)`,
        [`mv_${randomUUID().slice(0, 12)}`, r.vendor_id, r.variant_id, -r.qty, input.reservation_id, input.actor_id ?? null, input.note ?? null],
      );
      return { ok: true };
    });
  }

  async releaseReservation(input: ReleaseReservationInput): Promise<{ ok: true }> {
    const em = this.container_.resolve<EntityManager>('manager');
    return await em.transactional(async () => {
      const reservations = new ReservationRepository(em);
      const r = await reservations.lockActive(input.reservation_id);
      if (!r || r.status !== 'active') throw new Error(`Reservation ${input.reservation_id} not active`);
      await em.execute(
        `UPDATE wms_stock_pool SET reserved_qty = reserved_qty - ?, updated_at = NOW()
         WHERE vendor_id = ? AND variant_id = ?`,
        [r.qty, r.vendor_id, r.variant_id],
      );
      await reservations.markReleased(input.reservation_id);
      await em.execute(
        `INSERT INTO wms_movement (id, vendor_id, variant_id, type, qty_delta, source_id, note)
         VALUES (?, ?, ?, 'release', 0, ?, ?)`,
        [`mv_${randomUUID().slice(0, 12)}`, r.vendor_id, r.variant_id, input.reservation_id, input.reason ?? null],
      );
      return { ok: true };
    });
  }
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd backend/apps/api && npx jest integration-tests/wms/reservation-lifecycle.spec.ts`
Expected: PASS all 3 cases.

- [ ] **Step 7: Commit**

```bash
git add backend/apps/backend/src/modules/wms backend/apps/backend/integration-tests/wms/reservation-lifecycle.spec.ts
git commit -m "feat(wms): consumeReservation + releaseReservation with row-lock + audit"
```

---

## Task 10: Reservation expiry (lazy + scheduled cleanup)

**Files:**
- Create: `backend/apps/backend/src/modules/wms/jobs/reservation-expirer.job.ts`
- Modify: `backend/apps/backend/src/modules/wms/service.ts`
- Create: `backend/apps/backend/src/jobs/wms-reservation-expirer.ts` (Medusa scheduled job entry)

- [ ] **Step 1: Write the failing test**

Create: `backend/apps/backend/integration-tests/wms/reservation-expiry.spec.ts`

```ts
import { medusaIntegrationTestRunner } from '@medusajs/test-utils';

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    describe('Reservation expiry', () => {
      it('reserved_qty no longer counts an expired reservation in available calc (lazy)', async () => {
        const c = getContainer();
        const svc = c.resolve('wmsService');
        await svc.incrementStock({ vendor_id: 'v_exp', variant_id: 'var_e', qty: 10, type: 'restock' });
        // Create reservation with already-elapsed expiry
        const m = c.resolve('manager');
        const id = await m.transactional(async (tx: any) => {
          const rows: any[] = await tx.query(
            `INSERT INTO wms_reservation (id, vendor_id, order_id, variant_id, qty, expires_at, status)
             VALUES (?, 'v_exp','ord_exp','var_e',5, NOW() - INTERVAL '1 minute','active') RETURNING id`,
            [`rs_expired_${Date.now()}`],
          );
          // Bump pool reserved cache to reflect what would have been
          await tx.query(`UPDATE wms_stock_pool SET reserved_qty = 5 WHERE vendor_id='v_exp' AND variant_id='var_e'`);
          return rows[0].id;
        });
        // Available query ignores expired reservations
        const stock = await svc.getStock('v_exp', 'var_e');
        // Note: getStock returns the cached reserved_qty for performance; expireReservations() is what reconciles
        // After running expirer, available should be 10
        await svc.expireReservations();
        const stock2 = await svc.getStock('v_exp', 'var_e');
        expect(stock2.on_hand).toBe(10);
        expect(stock2.reserved).toBe(0);
        expect(stock2.available).toBe(10);
        // Verify the row was marked expired
        const after = await m.transactional((tx: any) =>
          tx.query(`SELECT status FROM wms_reservation WHERE id = ?`, [id])
        );
        expect(after[0].status).toBe('expired');
      });
    });
  },
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend/apps/api && npx jest integration-tests/wms/reservation-expiry.spec.ts`
Expected: FAIL — "expireReservations is not a function".

- [ ] **Step 3: Implement service method**

Modify `backend/apps/backend/src/modules/wms/service.ts`:
```ts
  async expireReservations(): Promise<{ expired_count: number }> {
    const em = this.container_.resolve<EntityManager>('manager');
    return await em.transactional(async () => {
      const rows: any[] = await em.execute(
        `SELECT id, vendor_id, variant_id, qty::numeric AS qty
         FROM wms_reservation
         WHERE status = 'active' AND expires_at < NOW()
         FOR UPDATE SKIP LOCKED`,
      );
      for (const row of rows) {
        await em.execute(
          `UPDATE wms_reservation SET status = 'expired', released_at = NOW() WHERE id = ?`,
          [row.id],
        );
        await em.execute(
          `UPDATE wms_stock_pool SET reserved_qty = reserved_qty - ?, updated_at = NOW()
           WHERE vendor_id = ? AND variant_id = ?`,
          [Number(row.qty), row.vendor_id, row.variant_id],
        );
        await em.execute(
          `INSERT INTO wms_movement (id, vendor_id, variant_id, type, qty_delta, source_id, note)
           VALUES (?, ?, ?, 'release', 0, ?, 'auto-expired')`,
          [`mv_${randomUUID().slice(0, 12)}`, row.vendor_id, row.variant_id, row.id],
        );
      }
      return { expired_count: rows.length };
    });
  }
```

- [ ] **Step 4: Create scheduled job entry**

Create `backend/apps/backend/src/jobs/wms-reservation-expirer.ts`:
```ts
import { MedusaContainer } from '@medusajs/types';

export default async function wmsReservationExpirerJob(container: MedusaContainer) {
  const svc: any = container.resolve('wmsService');
  const result = await svc.expireReservations();
  if (result.expired_count > 0) {
    container.resolve('logger').info(`[wms] expired ${result.expired_count} reservations`);
  }
}

export const config = {
  name: 'wms-reservation-expirer',
  schedule: '* * * * *', // every minute
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend/apps/api && npx jest integration-tests/wms/reservation-expiry.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/apps/backend/src/modules/wms backend/apps/backend/src/jobs/wms-reservation-expirer.ts backend/apps/backend/integration-tests/wms/reservation-expiry.spec.ts
git commit -m "feat(wms): expireReservations + scheduled job (every minute)"
```

---

## Task 11: Concurrency test (two-cashier last-unit race)

**Files:**
- Create: `backend/apps/backend/integration-tests/wms/concurrency.spec.ts`

- [ ] **Step 1: Write the failing test**

Create: `backend/apps/backend/integration-tests/wms/concurrency.spec.ts`

```ts
import { medusaIntegrationTestRunner } from '@medusajs/test-utils';

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    describe('Concurrency: last-unit race', () => {
      it('only one of two concurrent decrements succeeds when only 1 unit remains', async () => {
        const c = getContainer();
        const svc = c.resolve('wmsService');
        await svc.incrementStock({ vendor_id: 'v_race', variant_id: 'var_last', qty: 1, type: 'restock' });

        const attempt = () => svc.decrementStock({
          vendor_id: 'v_race', variant_id: 'var_last', qty: 1, type: 'sale',
          source_id: `concurrent_${Math.random()}`,
        });

        const results = await Promise.allSettled([attempt(), attempt()]);
        const fulfilled = results.filter(r => r.status === 'fulfilled');
        const rejected = results.filter(r => r.status === 'rejected');
        expect(fulfilled.length).toBe(1);
        expect(rejected.length).toBe(1);
        expect((rejected[0] as PromiseRejectedResult).reason.name).toBe('WmsInsufficientStockError');
        const final = await svc.getStock('v_race', 'var_last');
        expect(final.on_hand).toBe(0);
      });

      it('100 concurrent decrements of 1 unit each on 50 stock returns exactly 50 success / 50 failure', async () => {
        const c = getContainer();
        const svc = c.resolve('wmsService');
        await svc.incrementStock({ vendor_id: 'v_race2', variant_id: 'var_batch', qty: 50, type: 'restock' });

        const promises = Array.from({ length: 100 }).map((_, i) =>
          svc.decrementStock({
            vendor_id: 'v_race2', variant_id: 'var_batch', qty: 1, type: 'sale',
            source_id: `batch_${i}`,
          }).catch((e: any) => ({ error: e.name })),
        );
        const results = await Promise.all(promises);
        const ok = results.filter((r: any) => !r.error);
        const fail = results.filter((r: any) => r.error === 'WmsInsufficientStockError');
        expect(ok.length).toBe(50);
        expect(fail.length).toBe(50);
        const final = await svc.getStock('v_race2', 'var_batch');
        expect(final.on_hand).toBe(0);
      });
    });
  },
});
```

- [ ] **Step 2: Run test to verify it passes (atomic decrement already exists from Task 5)**

Run: `cd backend/apps/api && npx jest integration-tests/wms/concurrency.spec.ts`
Expected: PASS — both tests confirm row-level lock prevents over-sell.

If FAIL: investigate the `SELECT ... FOR UPDATE` in `atomicDecrement` — likely the transaction isolation is wrong or the lock isn't being held.

- [ ] **Step 3: Commit**

```bash
git add backend/apps/backend/integration-tests/wms/concurrency.spec.ts
git commit -m "test(wms): concurrent decrement never over-sells (last-unit race + 100-thread batch)"
```

---

## Task 12: Shop location model + geo radius query

**Files:**
- Create: `backend/apps/backend/src/modules/wms/models/shop-location.model.ts`
- Create: `backend/apps/backend/src/modules/wms/migrations/Migration20260525000004.ts`
- Create: `backend/apps/backend/src/modules/wms/repositories/shop-location.repository.ts`
- Modify: `backend/apps/backend/src/modules/wms/service.ts`
- Modify: `backend/apps/backend/src/modules/wms/types.ts`

- [ ] **Step 1: Write the failing test**

Create: `backend/apps/backend/integration-tests/wms/geo-radius.spec.ts`

```ts
import { medusaIntegrationTestRunner } from '@medusajs/test-utils';

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    describe('WmsService.shopsWithinRadius', () => {
      it('returns only shops within Haversine distance', async () => {
        const c = getContainer();
        const svc = c.resolve('wmsService');
        await svc.upsertShopLocation({ vendor_id: 'v_near', lat: 33.3152, lng: 44.3661, delivery_radius_km: 5, address_text: 'Karrada' });
        await svc.upsertShopLocation({ vendor_id: 'v_far',  lat: 36.1901, lng: 44.0096, delivery_radius_km: 5, address_text: 'Erbil' });
        const near = await svc.shopsWithinRadius({ lat: 33.3152, lng: 44.3661, radius_km: 10 });
        const ids = near.map((s: any) => s.vendor_id);
        expect(ids).toContain('v_near');
        expect(ids).not.toContain('v_far');
      });

      it('respects the shop\'s own delivery_radius_km (customer outside shop radius is excluded)', async () => {
        const c = getContainer();
        const svc = c.resolve('wmsService');
        await svc.upsertShopLocation({ vendor_id: 'v_tight', lat: 33.3152, lng: 44.3661, delivery_radius_km: 1, address_text: 'Tight Shop' });
        // Customer at ~5 km away
        const near = await svc.shopsWithinRadius({ lat: 33.36, lng: 44.40, radius_km: 50 });
        const ids = near.map((s: any) => s.vendor_id);
        expect(ids).not.toContain('v_tight');
      });
    });
  },
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend/apps/api && npx jest integration-tests/wms/geo-radius.spec.ts`
Expected: FAIL — "relation wms_shop_location does not exist" or "shopsWithinRadius is not a function".

- [ ] **Step 3: Create model**

Create `backend/apps/backend/src/modules/wms/models/shop-location.model.ts`:
```ts
import { model } from '@medusajs/framework/utils';

export const ShopLocation = model.define('wms_shop_location', {
  vendor_id: model.text().primaryKey(),
  lat: model.float(),
  lng: model.float(),
  delivery_radius_km: model.float().default(5),
  address_text: model.text().nullable(),
  updated_at: model.dateTime().default(() => new Date()),
});
```

- [ ] **Step 4: Create migration**

Create `backend/apps/backend/src/modules/wms/migrations/Migration20260525000004.ts`:
```ts
import { Migration } from '@mikro-orm/migrations';

export class Migration20260525000004 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS wms_shop_location (
        vendor_id           TEXT PRIMARY KEY,
        lat                 DOUBLE PRECISION NOT NULL,
        lng                 DOUBLE PRECISION NOT NULL,
        delivery_radius_km  DOUBLE PRECISION NOT NULL DEFAULT 5,
        address_text        TEXT,
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX idx_loc_lat_lng ON wms_shop_location (lat, lng);
    `);
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS wms_shop_location;`);
  }
}
```

- [ ] **Step 5: Create repository**

Create `backend/apps/backend/src/modules/wms/repositories/shop-location.repository.ts`:
```ts
import { EntityManager } from '@mikro-orm/postgresql';

export class ShopLocationRepository {
  constructor(private readonly em: EntityManager) {}

  async upsert(input: {
    vendor_id: string; lat: number; lng: number; delivery_radius_km: number; address_text?: string;
  }): Promise<void> {
    await this.em.execute(
      `INSERT INTO wms_shop_location (vendor_id, lat, lng, delivery_radius_km, address_text)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (vendor_id) DO UPDATE
       SET lat = EXCLUDED.lat, lng = EXCLUDED.lng,
           delivery_radius_km = EXCLUDED.delivery_radius_km,
           address_text = EXCLUDED.address_text,
           updated_at = NOW()`,
      [input.vendor_id, input.lat, input.lng, input.delivery_radius_km, input.address_text ?? null],
    );
  }

  /**
   * Haversine distance + both-radii filter.
   * Customer point is (cLat, cLng); cRadius is the max distance the customer is willing to travel.
   * A shop is in-radius if distance ≤ MIN(cRadius, shop.delivery_radius_km).
   */
  async withinRadius(cLat: number, cLng: number, cRadiusKm: number): Promise<Array<{
    vendor_id: string; lat: number; lng: number; delivery_radius_km: number; distance_km: number;
  }>> {
    const rows: any[] = await this.em.execute(
      `WITH q AS (
         SELECT vendor_id, lat, lng, delivery_radius_km,
           (6371 * 2 * ASIN(SQRT(
             POWER(SIN(RADIANS((? - lat) / 2)), 2) +
             COS(RADIANS(?)) * COS(RADIANS(lat)) *
             POWER(SIN(RADIANS((? - lng) / 2)), 2)
           ))) AS distance_km
         FROM wms_shop_location
       )
       SELECT * FROM q
       WHERE distance_km <= LEAST(?, delivery_radius_km)
       ORDER BY distance_km ASC`,
      [cLat, cLat, cLng, cRadiusKm],
    );
    return rows.map((r) => ({
      vendor_id: r.vendor_id,
      lat: Number(r.lat),
      lng: Number(r.lng),
      delivery_radius_km: Number(r.delivery_radius_km),
      distance_km: Number(r.distance_km),
    }));
  }
}
```

- [ ] **Step 6: Extend types + service**

Modify `backend/apps/backend/src/modules/wms/types.ts`:
```ts
export type UpsertShopLocationInput = {
  vendor_id: string;
  lat: number;
  lng: number;
  delivery_radius_km: number;
  address_text?: string;
};

export type ShopsWithinRadiusInput = {
  lat: number;
  lng: number;
  radius_km: number;
};

export type ShopLocationResult = {
  vendor_id: string;
  lat: number;
  lng: number;
  delivery_radius_km: number;
  distance_km: number;
};

// Add to WmsServiceInterface:
//   upsertShopLocation(input: UpsertShopLocationInput): Promise<{ ok: true }>;
//   shopsWithinRadius(input: ShopsWithinRadiusInput): Promise<ShopLocationResult[]>;
```

Modify `backend/apps/backend/src/modules/wms/service.ts` — add `ShopLocation` to the `MedusaService` call:
```ts
export class WmsService extends MedusaService({ StockPool, Movement, Reservation, ShopLocation }) implements WmsServiceInterface {
  // ...

  async upsertShopLocation(input: UpsertShopLocationInput): Promise<{ ok: true }> {
    const em = this.container_.resolve<EntityManager>('manager');
    await new ShopLocationRepository(em).upsert(input);
    return { ok: true };
  }

  async shopsWithinRadius(input: ShopsWithinRadiusInput): Promise<ShopLocationResult[]> {
    const em = this.container_.resolve<EntityManager>('manager');
    return await new ShopLocationRepository(em).withinRadius(input.lat, input.lng, input.radius_km);
  }
}
```

Don't forget to register `ShopLocation` in `index.ts` `models` array.

- [ ] **Step 7: Run migration + test**

Run: `cd backend/apps/api && npx medusa db:migrate && npx jest integration-tests/wms/geo-radius.spec.ts`
Expected: PASS both tests.

- [ ] **Step 8: Commit**

```bash
git add backend/apps/backend/src/modules/wms backend/apps/backend/integration-tests/wms/geo-radius.spec.ts
git commit -m "feat(wms): shop location upsert + Haversine radius query (both customer + shop radii)"
```

---

## Task 13: Event emissions

**Files:**
- Create: `backend/apps/backend/src/modules/wms/events.ts`
- Modify: `backend/apps/backend/src/modules/wms/service.ts`

- [ ] **Step 1: Write the failing test**

Create: `backend/apps/backend/integration-tests/wms/events.spec.ts`

```ts
import { medusaIntegrationTestRunner } from '@medusajs/test-utils';

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    describe('WMS event emissions', () => {
      it('emits wms.stock.decremented after a sale', async () => {
        const c = getContainer();
        const events = c.resolve('event_bus');
        const captured: any[] = [];
        events.subscribe('wms.stock.decremented', (data: any) => captured.push(data));
        const svc = c.resolve('wmsService');
        await svc.incrementStock({ vendor_id: 'v_ev', variant_id: 'var_ev', qty: 5, type: 'restock' });
        await svc.decrementStock({ vendor_id: 'v_ev', variant_id: 'var_ev', qty: 2, type: 'sale', source_id: 'order_z' });
        // Allow event-loop flush
        await new Promise((r) => setTimeout(r, 50));
        expect(captured.length).toBeGreaterThanOrEqual(1);
        const evt = captured[captured.length - 1];
        expect(evt.vendor_id).toBe('v_ev');
        expect(evt.variant_id).toBe('var_ev');
        expect(evt.qty).toBe(2);
      });

      it('emits wms.reservation.created and wms.reservation.consumed', async () => {
        const c = getContainer();
        const events = c.resolve('event_bus');
        const captured: any[] = [];
        events.subscribe('wms.reservation.created', (d: any) => captured.push({ event: 'created', ...d }));
        events.subscribe('wms.reservation.consumed', (d: any) => captured.push({ event: 'consumed', ...d }));
        const svc = c.resolve('wmsService');
        await svc.incrementStock({ vendor_id: 'v_e2', variant_id: 'var_e2', qty: 5, type: 'restock' });
        const r = await svc.createReservation({ vendor_id: 'v_e2', order_id: 'ord_e2', variant_id: 'var_e2', qty: 1 });
        await svc.consumeReservation({ reservation_id: r.id });
        await new Promise((res) => setTimeout(res, 50));
        const created = captured.find((e) => e.event === 'created');
        const consumed = captured.find((e) => e.event === 'consumed');
        expect(created).toBeDefined();
        expect(consumed).toBeDefined();
      });
    });
  },
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend/apps/api && npx jest integration-tests/wms/events.spec.ts`
Expected: FAIL — no events captured.

- [ ] **Step 3: Create event constants**

Create `backend/apps/backend/src/modules/wms/events.ts`:
```ts
export const WMS_EVENTS = {
  STOCK_INCREMENTED: 'wms.stock.incremented',
  STOCK_DECREMENTED: 'wms.stock.decremented',
  RESERVATION_CREATED: 'wms.reservation.created',
  RESERVATION_CONSUMED: 'wms.reservation.consumed',
  RESERVATION_RELEASED: 'wms.reservation.released',
  RESERVATION_EXPIRED: 'wms.reservation.expired',
} as const;

export type WmsStockEventPayload = {
  vendor_id: string;
  variant_id: string;
  qty: number;
  new_on_hand: number;
  source_id?: string;
  actor_id?: string;
};

export type WmsReservationEventPayload = {
  reservation_id: string;
  vendor_id: string;
  variant_id: string;
  qty: number;
  order_id?: string;
};
```

- [ ] **Step 4: Emit from service methods**

Modify `backend/apps/backend/src/modules/wms/service.ts` — at top, resolve event bus:
```ts
import { WMS_EVENTS } from './events';

// inside class — add a helper:
private get events() {
  return this.container_.resolve<{ emit: (name: string, data: unknown) => Promise<void> }>('event_bus');
}
```

After each successful state change, emit. For example in `decrementStock`, just before returning:
```ts
await this.events.emit(WMS_EVENTS.STOCK_DECREMENTED, {
  vendor_id: input.vendor_id,
  variant_id: input.variant_id,
  qty: input.qty,
  new_on_hand,
  source_id: input.source_id,
  actor_id: input.actor_id,
});
```

Apply the same pattern in `incrementStock` (`STOCK_INCREMENTED`), `createReservation` (`RESERVATION_CREATED`), `consumeReservation` (`RESERVATION_CONSUMED`), `releaseReservation` (`RESERVATION_RELEASED`), and inside `expireReservations`'s loop (`RESERVATION_EXPIRED`).

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend/apps/api && npx jest integration-tests/wms/events.spec.ts`
Expected: PASS both tests.

- [ ] **Step 6: Commit**

```bash
git add backend/apps/backend/src/modules/wms backend/apps/backend/integration-tests/wms/events.spec.ts
git commit -m "feat(wms): emit domain events for stock + reservation transitions"
```

---

## Task 14: Drift detection job

**Files:**
- Create: `backend/apps/backend/src/modules/wms/jobs/stock-drift-detector.job.ts`
- Modify: `backend/apps/backend/src/modules/wms/service.ts`
- Modify: `backend/apps/backend/src/modules/wms/types.ts`
- Create: `backend/apps/backend/src/jobs/wms-drift-nightly.ts`

- [ ] **Step 1: Write the failing test**

Create: `backend/apps/backend/integration-tests/wms/drift.spec.ts`

```ts
import { medusaIntegrationTestRunner } from '@medusajs/test-utils';

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    describe('WmsService.detectStockDrift', () => {
      it('flags rows where on_hand_qty drifted negative or reserved > on_hand', async () => {
        const c = getContainer();
        const m = c.resolve('manager');
        await m.transactional(async (tx: any) => {
          await tx.query(`INSERT INTO wms_stock_pool (id, vendor_id, variant_id, on_hand_qty, reserved_qty) VALUES ('sp_drift_a','v_drift','var_a',-1,0)`);
          await tx.query(`INSERT INTO wms_stock_pool (id, vendor_id, variant_id, on_hand_qty, reserved_qty) VALUES ('sp_drift_b','v_drift','var_b',5,7)`);
          await tx.query(`INSERT INTO wms_stock_pool (id, vendor_id, variant_id, on_hand_qty, reserved_qty) VALUES ('sp_drift_c','v_drift','var_c',5,2)`);
        });
        const svc = c.resolve('wmsService');
        const report = await svc.detectStockDrift({ vendor_id: 'v_drift' });
        const flagged = report.flagged.map((r: any) => r.variant_id);
        expect(flagged).toContain('var_a');
        expect(flagged).toContain('var_b');
        expect(flagged).not.toContain('var_c');
      });
    });
  },
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend/apps/api && npx jest integration-tests/wms/drift.spec.ts`
Expected: FAIL — "detectStockDrift is not a function".

- [ ] **Step 3: Add types + implement**

Modify `backend/apps/backend/src/modules/wms/types.ts`:
```ts
export type DriftFlag = 'negative_on_hand' | 'reserved_exceeds_on_hand';
export type DriftReport = {
  flagged: Array<{
    vendor_id: string;
    variant_id: string;
    on_hand: number;
    reserved: number;
    flag: DriftFlag;
  }>;
};

// Add to WmsServiceInterface:
//   detectStockDrift(input: { vendor_id?: string }): Promise<DriftReport>;
```

Modify `backend/apps/backend/src/modules/wms/service.ts`:
```ts
  async detectStockDrift(input: { vendor_id?: string }): Promise<DriftReport> {
    const em = this.container_.resolve<EntityManager>('manager');
    const filter = input.vendor_id ? `WHERE vendor_id = ?` : '';
    const args = input.vendor_id ? [input.vendor_id] : [];
    const rows: any[] = await em.execute(
      `SELECT vendor_id, variant_id, on_hand_qty::numeric AS on_hand, reserved_qty::numeric AS reserved
       FROM wms_stock_pool ${filter}`,
      args,
    );
    const flagged: DriftReport['flagged'] = [];
    for (const r of rows) {
      const onHand = Number(r.on_hand);
      const reserved = Number(r.reserved);
      if (onHand < 0) {
        flagged.push({ vendor_id: r.vendor_id, variant_id: r.variant_id, on_hand: onHand, reserved, flag: 'negative_on_hand' });
      } else if (reserved > onHand) {
        flagged.push({ vendor_id: r.vendor_id, variant_id: r.variant_id, on_hand: onHand, reserved, flag: 'reserved_exceeds_on_hand' });
      }
    }
    return { flagged };
  }
```

- [ ] **Step 4: Create scheduled job entry**

Create `backend/apps/backend/src/jobs/wms-drift-nightly.ts`:
```ts
import { MedusaContainer } from '@medusajs/types';

export default async function wmsDriftNightlyJob(container: MedusaContainer) {
  const svc: any = container.resolve('wmsService');
  const result = await svc.detectStockDrift({});
  const logger = container.resolve('logger') as any;
  if (result.flagged.length > 0) {
    logger.warn(`[wms] drift detected: ${result.flagged.length} pool rows flagged`);
    for (const f of result.flagged) {
      logger.warn(`  vendor=${f.vendor_id} variant=${f.variant_id} on_hand=${f.on_hand} reserved=${f.reserved} flag=${f.flag}`);
    }
  } else {
    logger.info(`[wms] drift nightly: 0 flagged`);
  }
}

export const config = {
  name: 'wms-drift-nightly',
  schedule: '0 2 * * *', // 02:00 local each night
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend/apps/api && npx jest integration-tests/wms/drift.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/apps/backend/src/modules/wms backend/apps/backend/src/jobs/wms-drift-nightly.ts backend/apps/backend/integration-tests/wms/drift.spec.ts
git commit -m "feat(wms): drift detection (negative on_hand / reserved>on_hand) + nightly job"
```

---

## Task 15: Admin REST API — stock, reservations, movements

**Files:**
- Create: `backend/apps/backend/src/api/admin/wms/stock/route.ts`
- Create: `backend/apps/backend/src/api/admin/wms/reservations/route.ts`
- Create: `backend/apps/backend/src/api/admin/wms/movements/route.ts`
- Create: `backend/apps/backend/src/api/admin/wms/drift-report/route.ts`
- Create: `backend/apps/backend/src/api/admin/wms/locations/route.ts`

- [ ] **Step 1: Write the failing test**

Create: `backend/apps/backend/integration-tests/wms/api-admin.spec.ts`

```ts
import { medusaIntegrationTestRunner } from '@medusajs/test-utils';

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe('Admin WMS routes', () => {
      it('GET /admin/wms/stock?vendor_id&variant_id returns snapshot', async () => {
        const svc = getContainer().resolve('wmsService');
        await svc.incrementStock({ vendor_id: 'v_api', variant_id: 'var_api', qty: 7, type: 'restock' });
        const res = await api.get('/admin/wms/stock?vendor_id=v_api&variant_id=var_api');
        expect(res.status).toBe(200);
        expect(res.data.on_hand).toBe(7);
      });

      it('POST /admin/wms/stock adjusts (positive = increment, negative = decrement)', async () => {
        const res = await api.post('/admin/wms/stock', {
          vendor_id: 'v_api', variant_id: 'var_api2', qty: 10, type: 'restock',
        });
        expect(res.status).toBe(200);
        expect(res.data.new_on_hand).toBe(10);
      });

      it('GET /admin/wms/movements?vendor_id returns audit log', async () => {
        const res = await api.get('/admin/wms/movements?vendor_id=v_api');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.data.movements)).toBe(true);
      });

      it('GET /admin/wms/drift-report returns flagged rows', async () => {
        const res = await api.get('/admin/wms/drift-report');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.data.flagged)).toBe(true);
      });
    });
  },
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend/apps/api && npx jest integration-tests/wms/api-admin.spec.ts`
Expected: FAIL — 404 on each route.

- [ ] **Step 3: Implement the routes**

Create `backend/apps/backend/src/api/admin/wms/stock/route.ts`:
```ts
import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const vendor_id = req.query.vendor_id as string;
  const variant_id = req.query.variant_id as string;
  if (!vendor_id || !variant_id) return res.status(400).json({ error: 'vendor_id + variant_id required' });
  const svc: any = req.scope.resolve('wmsService');
  const snapshot = await svc.getStock(vendor_id, variant_id);
  res.json(snapshot);
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { vendor_id, variant_id, qty, type, source_id, actor_id, note } = req.body as any;
  if (!vendor_id || !variant_id || qty == null || !type) return res.status(400).json({ error: 'missing fields' });
  const svc: any = req.scope.resolve('wmsService');
  const fn = qty > 0 ? svc.incrementStock.bind(svc) : svc.decrementStock.bind(svc);
  const result = await fn({ vendor_id, variant_id, qty: Math.abs(qty), type, source_id, actor_id, note });
  res.json(result);
}
```

Create `backend/apps/backend/src/api/admin/wms/reservations/route.ts`:
```ts
import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const vendor_id = req.query.vendor_id as string;
  if (!vendor_id) return res.status(400).json({ error: 'vendor_id required' });
  const em: any = req.scope.resolve('manager');
  const rows = await em.execute(
    `SELECT * FROM wms_reservation WHERE vendor_id = ? ORDER BY created_at DESC LIMIT 100`,
    [vendor_id],
  );
  res.json({ reservations: rows });
}
```

Create `backend/apps/backend/src/api/admin/wms/movements/route.ts`:
```ts
import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const vendor_id = req.query.vendor_id as string;
  const variant_id = req.query.variant_id as string | undefined;
  if (!vendor_id) return res.status(400).json({ error: 'vendor_id required' });
  const em: any = req.scope.resolve('manager');
  const args: any[] = [vendor_id];
  let where = `WHERE vendor_id = ?`;
  if (variant_id) { where += ` AND variant_id = ?`; args.push(variant_id); }
  const rows = await em.execute(
    `SELECT * FROM wms_movement ${where} ORDER BY created_at DESC LIMIT 200`,
    args,
  );
  res.json({ movements: rows });
}
```

Create `backend/apps/backend/src/api/admin/wms/drift-report/route.ts`:
```ts
import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const vendor_id = req.query.vendor_id as string | undefined;
  const svc: any = req.scope.resolve('wmsService');
  const result = await svc.detectStockDrift({ vendor_id });
  res.json(result);
}
```

Create `backend/apps/backend/src/api/admin/wms/locations/route.ts`:
```ts
import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const { vendor_id, lat, lng, delivery_radius_km, address_text } = req.body as any;
  if (!vendor_id || lat == null || lng == null) return res.status(400).json({ error: 'vendor_id + lat + lng required' });
  const svc: any = req.scope.resolve('wmsService');
  await svc.upsertShopLocation({ vendor_id, lat, lng, delivery_radius_km: delivery_radius_km ?? 5, address_text });
  res.json({ ok: true });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend/apps/api && npx jest integration-tests/wms/api-admin.spec.ts`
Expected: PASS all 4 tests.

- [ ] **Step 5: Commit**

```bash
git add backend/apps/backend/src/api/admin/wms backend/apps/backend/integration-tests/wms/api-admin.spec.ts
git commit -m "feat(wms): admin REST routes for stock / reservations / movements / drift / locations"
```

---

## Task 16: Store REST API — shops-nearby + availability check

**Files:**
- Create: `backend/apps/backend/src/api/store/wms/shops-nearby/route.ts`
- Create: `backend/apps/backend/src/api/store/wms/availability/route.ts`

- [ ] **Step 1: Write the failing test**

Create: `backend/apps/backend/integration-tests/wms/api-store.spec.ts`

```ts
import { medusaIntegrationTestRunner } from '@medusajs/test-utils';

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe('Store WMS routes', () => {
      it('GET /store/wms/shops-nearby returns shops in radius', async () => {
        const svc = getContainer().resolve('wmsService');
        await svc.upsertShopLocation({ vendor_id: 'v_store_a', lat: 33.3152, lng: 44.3661, delivery_radius_km: 5, address_text: 'Karrada' });
        const res = await api.get('/store/wms/shops-nearby?lat=33.3152&lng=44.3661&radius_km=10');
        expect(res.status).toBe(200);
        expect(res.data.shops.length).toBeGreaterThan(0);
      });

      it('POST /store/wms/availability returns per-line availability', async () => {
        const svc = getContainer().resolve('wmsService');
        await svc.incrementStock({ vendor_id: 'v_avail', variant_id: 'var_avail_a', qty: 5, type: 'restock' });
        const res = await api.post('/store/wms/availability', {
          vendor_id: 'v_avail',
          lines: [
            { variant_id: 'var_avail_a', qty: 2 },
            { variant_id: 'var_avail_b', qty: 1 },
          ],
        });
        expect(res.status).toBe(200);
        const map = Object.fromEntries(res.data.lines.map((l: any) => [l.variant_id, l]));
        expect(map['var_avail_a'].available).toBe(true);
        expect(map['var_avail_b'].available).toBe(false);
      });
    });
  },
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend/apps/api && npx jest integration-tests/wms/api-store.spec.ts`
Expected: FAIL — 404.

- [ ] **Step 3: Implement routes**

Create `backend/apps/backend/src/api/store/wms/shops-nearby/route.ts`:
```ts
import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const radius_km = Number(req.query.radius_km ?? 10);
  if (!isFinite(lat) || !isFinite(lng)) return res.status(400).json({ error: 'lat + lng required' });
  const svc: any = req.scope.resolve('wmsService');
  const shops = await svc.shopsWithinRadius({ lat, lng, radius_km });
  res.json({ shops });
}
```

Create `backend/apps/backend/src/api/store/wms/availability/route.ts`:
```ts
import type { MedusaRequest, MedusaResponse } from '@medusajs/framework/http';

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { vendor_id, lines } = req.body as any;
  if (!vendor_id || !Array.isArray(lines)) return res.status(400).json({ error: 'vendor_id + lines[] required' });
  const svc: any = req.scope.resolve('wmsService');
  const results = await Promise.all(lines.map(async (l: any) => {
    const snap = await svc.getStock(vendor_id, l.variant_id);
    return {
      variant_id: l.variant_id,
      requested: l.qty,
      available: snap.available >= l.qty,
      available_qty: snap.available,
    };
  }));
  res.json({ lines: results });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend/apps/api && npx jest integration-tests/wms/api-store.spec.ts`
Expected: PASS both tests.

- [ ] **Step 5: Commit**

```bash
git add backend/apps/backend/src/api/store/wms backend/apps/backend/integration-tests/wms/api-store.spec.ts
git commit -m "feat(wms): store routes — shops-nearby (geo) + availability check"
```

---

## Task 17: End-to-end integration scenario

**Files:**
- Create: `backend/apps/backend/integration-tests/wms/e2e-order-loop.spec.ts`

- [ ] **Step 1: Write the failing test (which will pass — it's an integration validation)**

Create: `backend/apps/backend/integration-tests/wms/e2e-order-loop.spec.ts`

```ts
import { medusaIntegrationTestRunner } from '@medusajs/test-utils';

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    describe('WMS end-to-end order loop', () => {
      it('shop has 5 units → customer reserves 2 → picker confirms → on_hand=3 reserved=0', async () => {
        const c = getContainer();
        const svc = c.resolve('wmsService');
        await svc.incrementStock({ vendor_id: 'v_e2e', variant_id: 'var_e2e', qty: 5, type: 'restock' });
        const r = await svc.createReservation({
          vendor_id: 'v_e2e', order_id: 'ord_e2e_1', variant_id: 'var_e2e', qty: 2,
        });
        let snap = await svc.getStock('v_e2e', 'var_e2e');
        expect(snap.on_hand).toBe(5);
        expect(snap.reserved).toBe(2);
        expect(snap.available).toBe(3);

        await svc.consumeReservation({ reservation_id: r.id, actor_id: 'picker_e2e' });
        snap = await svc.getStock('v_e2e', 'var_e2e');
        expect(snap.on_hand).toBe(3);
        expect(snap.reserved).toBe(0);
        expect(snap.available).toBe(3);
      });

      it('shop has 5 units → customer reserves 4 → cancels → release returns capacity → second customer can order 4', async () => {
        const c = getContainer();
        const svc = c.resolve('wmsService');
        await svc.incrementStock({ vendor_id: 'v_e2e2', variant_id: 'var_e2e2', qty: 5, type: 'restock' });
        const r = await svc.createReservation({ vendor_id: 'v_e2e2', order_id: 'ord_x', variant_id: 'var_e2e2', qty: 4 });
        await svc.releaseReservation({ reservation_id: r.id, reason: 'customer_cancel' });
        const r2 = await svc.createReservation({ vendor_id: 'v_e2e2', order_id: 'ord_y', variant_id: 'var_e2e2', qty: 4 });
        expect(r2.id).toMatch(/^rs_/);
      });

      it('reservation TTL expires → released stock available again', async () => {
        const c = getContainer();
        const svc = c.resolve('wmsService');
        await svc.incrementStock({ vendor_id: 'v_ttl_e2e', variant_id: 'var_ttl', qty: 3, type: 'restock' });
        // Reservation with 1-second TTL
        await svc.createReservation({
          vendor_id: 'v_ttl_e2e', order_id: 'ord_ttl', variant_id: 'var_ttl', qty: 3, ttl_seconds: 1,
        });
        let snap = await svc.getStock('v_ttl_e2e', 'var_ttl');
        expect(snap.available).toBe(0);
        await new Promise((r) => setTimeout(r, 1500));
        await svc.expireReservations();
        snap = await svc.getStock('v_ttl_e2e', 'var_ttl');
        expect(snap.available).toBe(3);
      });
    });
  },
});
```

- [ ] **Step 2: Run test**

Run: `cd backend/apps/api && npx jest integration-tests/wms/e2e-order-loop.spec.ts`
Expected: PASS all 3 scenarios.

If any FAIL, debug — but everything underneath has been individually tested in Tasks 1-16, so if these fail, it's a wiring bug in a service method.

- [ ] **Step 3: Commit**

```bash
git add backend/apps/backend/integration-tests/wms/e2e-order-loop.spec.ts
git commit -m "test(wms): end-to-end order loop (reserve → consume / cancel / expire)"
```

---

## Task 18: Run full WMS test suite + tag the phase

**Files:** none modified

- [ ] **Step 1: Run all WMS tests**

Run: `cd backend/apps/api && npx jest integration-tests/wms --runInBand`

Expected: all 17 spec files green. ~100+ assertions. No FAIL.

If FAIL: stop and debug. Don't tag the phase until green.

- [ ] **Step 2: Run TypeScript check**

Run: `cd backend/apps/api && npx tsc --noEmit`

Expected: zero errors.

- [ ] **Step 3: Tag the phase complete**

```bash
git tag -a phase-h1-backbone-wms-complete -m "Phase H-1 (Backbone-WMS) complete: stock pool, atomic decrement, reservations with 15-min TTL, lazy + scheduled expiry, geo radius, events, drift detection, admin + store APIs"
git push --tags
```

(Skip `git push --tags` if not pushing remote.)

- [ ] **Step 4: Update memory**

Append to `C:\Users\h00816626\.claude\projects\d--Personal-08-Ecommerce-app\memory\MEMORY.md`:

```
- [Phase H-1 Backbone-WMS shipped](project_phase_h1_done.md) — WMS module live in Medusa backend: stock pool, atomic decrement, 15-min reservation TTL, lazy + scheduled expiry, geo radius (Haversine), domain events, drift detection, admin + store REST routes. Next: Phase H-2 PoS shell.
```

Create the memory file:
```
---
name: project-phase-h1-done
description: Phase H-1 Backbone-WMS shipped. Medusa module exposing single source of truth for stock + reservations + geo. Atomic concurrent decrements verified. Phase H-2 PoS shell next.
metadata:
  type: project
---

WMS module at `backend/apps/backend/src/modules/wms/`. Public surface:
- WmsService: getStock, decrementStock, incrementStock, createReservation,
  consumeReservation, releaseReservation, expireReservations,
  upsertShopLocation, shopsWithinRadius, detectStockDrift.
- Events: wms.stock.{incremented,decremented}, wms.reservation.{created,
  consumed,released,expired}.
- Admin routes: /admin/wms/{stock,reservations,movements,drift-report,locations}.
- Store routes: /store/wms/{shops-nearby,availability}.
- Scheduled: reservation-expirer (every minute), drift-nightly (02:00).

Tables: wms_stock_pool, wms_reservation, wms_movement, wms_shop_location.

Concurrency: row-level lock + insert-or-update; verified safe under 100-thread
last-unit race in `concurrency.spec.ts`. Reservation TTL default 900s.

Next: Phase H-2 PoS shell (React+Vite web app, PWA install, IndexedDB cache,
barcode HID, ESC/POS print).
```

- [ ] **Step 5: Final commit**

```bash
git add memory
git commit -m "docs: Phase H-1 WMS shipped — memory updated, next is Phase H-2 PoS shell"
```

---

## Self-review

**1. Spec coverage check (against vision doc Section 5 Phase H-1):**
- ✅ Stock model (single pool per shop+SKU) → Tasks 2, 3, 5, 6
- ✅ Reservation engine with TTL → Tasks 7, 8, 9, 10
- ✅ Atomic decrement → Task 5, verified Task 11
- ✅ Multi-tenant scoping → enforced by `vendor_id` on every model + every API requiring it
- ✅ Geo radius API → Task 12
- ✅ Event bus pattern → Task 13
- ✅ Drift detection nightly job → Task 14
- ✅ Admin + store routes → Tasks 15, 16

**2. Placeholder scan:**
- No "TBD" / "TODO" / "implement later" anywhere
- Every step shows actual code
- Tasks 1-18 each produce a working commit

**3. Type consistency:**
- `WmsServiceInterface` accumulated across types.ts — `ping`, `getStock`, `decrementStock`, `incrementStock`, `createReservation`, `consumeReservation`, `releaseReservation`, `expireReservations`, `upsertShopLocation`, `shopsWithinRadius`, `detectStockDrift` — all match the methods implemented.
- `MovementType` enum used identically in model + types
- `ReservationStatus` enum used identically in model + tests
- `StockSnapshot` shape `{on_hand, reserved, available}` consistent everywhere
- Repository constructor signatures `(em: EntityManager)` consistent
- Event payload types in `events.ts` match what service emits

All consistent. Plan is ready.

---

## Velocity check

18 tasks × ~30-60 min each = 9-18 hours focused work for a tight engineer. With subagent dispatch and parallel context, realistic = **~2-3 weeks** to phase-complete with thorough testing.

Falls within vision doc's "3-4 weeks per phase" budget.

---

## Out of scope (intentional for H-1, picked up by later phases)

- **PoS shell** (H-2) — consumes WMS via REST
- **Inventory & Vendor Admin UI** (H-3) — consumes WMS via REST
- **Customer-app wire** (D-1) — consumes WMS shops-nearby + availability + reservation
- **Picker app** (J) — consumes WMS consumeReservation
- **AI hooks** — drift detector flags don't yet trigger Najma alerts; restock predictor lives in D-3
- **Production deploy** (E) — local dev only for H-1
