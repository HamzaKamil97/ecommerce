# Payment Providers Plan — Iraq + International

Target market: **Iraq first**, international second. Supports four lanes:

1. **ZainCash** — Iraq's most popular mobile wallet (Zain Telecom subsidiary)
2. **QiCard** — Iraq's dominant card / wallet, government salary cards, expanding into ecommerce
3. **AsiaPay** — Online card gateway serving Iraq (IQD), regional reach
4. **Visa / Mastercard via Stripe** — International + Iraq-issued cards routed through international networks

Sources:
- [ZainCash docs](https://docs.zaincash.iq/) (v2, updated Jan 2026)
- [QiCard developer portal](https://developers-gate.qi.iq/)
- [AsiaPay integration](https://www.asiapay.iq/integration)
- npm [`iraq-epayment`](https://www.npmjs.com/package/iraq-epayment) (multi-provider wrapper)
- [`fatora.io`](https://fatora.io/api/zaincash.php) (aggregator, can wrap ZainCash + QiCard in one API)

## Architecture — Medusa custom payment provider module

Like our POS module, we use an **adapter pattern**. One Medusa payment provider class per real provider, all registered into a registry. The customer picks one at checkout. Each adapter implements a small interface:

```ts
interface PaymentProvider {
  readonly id: string                        // "zaincash" | "qicard" | "asiapay" | "stripe" | "manual"
  readonly label: string                     // shown to customer
  readonly icon_url: string

  // Customer hits "Pay" — return a URL to redirect to OR a client-side token for hosted forms.
  initiate(input: {
    order_id: string
    amount_cents: number
    currency: string
    customer_email: string
    success_url: string
    failure_url: string
  }): Promise<{ redirect_url?: string; client_token?: string; provider_ref: string }>

  // Verify the callback after the customer returns.
  verify(callback: { signature?: string; jwt?: string; provider_ref: string }): Promise<{
    ok: boolean
    amount_cents: number
    error?: string
  }>

  // Refund (full or partial).
  refund(input: { provider_ref: string; amount_cents: number }): Promise<{ ok: boolean }>
}
```

## ZainCash adapter

OAuth2 + redirect flow.

```ts
async initiate(input) {
  // 1. Get OAuth token
  const tokenRes = await fetch('https://api.zaincash.iq/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.ZAINCASH_CLIENT_ID!,
      client_secret: process.env.ZAINCASH_CLIENT_SECRET!,
    }),
  })
  const { access_token } = await tokenRes.json()

  // 2. Init transaction
  const txn = await fetch('https://api.zaincash.iq/api/v2/payment-gateway/transaction/init', {
    method: 'POST',
    headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: input.amount_cents / 100,        // IQD has no minor units
      currency: 'IQD',
      orderId: input.order_id,
      serviceType: 'ecommerce',
      msisdn: input.customer_phone,            // optional — pre-fill phone
      redirectUrl: input.success_url,
      cancelUrl: input.failure_url,
    }),
  })
  const data = await txn.json()
  return { redirect_url: data.redirectUrl, provider_ref: data.transactionId }
}

async verify(callback) {
  // ZainCash returns a JWT on successUrl with token=<jwt>
  // Verify signature with our ZAINCASH_PUBLIC_KEY
  const jwt = require('jsonwebtoken')
  const decoded = jwt.verify(callback.jwt!, process.env.ZAINCASH_PUBLIC_KEY!)
  return {
    ok: decoded.status === 'success',
    amount_cents: Math.round(decoded.amount * 100),
  }
}
```

**Env vars**: `ZAINCASH_CLIENT_ID`, `ZAINCASH_CLIENT_SECRET`, `ZAINCASH_PUBLIC_KEY`
**Get credentials**: register at [zaincash.iq business portal](https://zaincash.iq/business/payment-gateway-faq).

## QiCard adapter

Card + wallet via QiCard's developer gateway.

```ts
async initiate(input) {
  const res = await fetch('https://developers-gate.qi.iq/api/transactions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Merchant-Id': process.env.QICARD_MERCHANT_ID!,
      'X-Api-Key': process.env.QICARD_API_KEY!,
    },
    body: JSON.stringify({
      amount: input.amount_cents,
      currency: 'IQD',
      order_id: input.order_id,
      callback_url: input.success_url,
      cancel_url: input.failure_url,
      customer: { email: input.customer_email },
    }),
  })
  const data = await res.json()
  return { redirect_url: data.payment_url, provider_ref: data.transaction_id }
}
```

**Env vars**: `QICARD_MERCHANT_ID`, `QICARD_API_KEY`, `QICARD_HMAC_SECRET` (for callback signature)
**Get credentials**: contact QiCard merchant services via [qi.iq](https://qi.iq/en/home).

## AsiaPay adapter

Card gateway with hosted payment page.

```ts
async initiate(input) {
  // AsiaPay uses a hashed signature over (merchant_id, order_id, amount, currency, secret)
  const sig = crypto
    .createHmac('sha256', process.env.ASIAPAY_SECRET!)
    .update(`${process.env.ASIAPAY_MERCHANT_ID}|${input.order_id}|${input.amount_cents}|IQD`)
    .digest('hex')

  const params = new URLSearchParams({
    merchantId: process.env.ASIAPAY_MERCHANT_ID!,
    orderRef: input.order_id,
    amount: String(input.amount_cents),
    currCode: '368',                          // ISO 4217 numeric for IQD
    payType: 'N',                             // Normal payment
    successUrl: input.success_url,
    failUrl: input.failure_url,
    cancelUrl: input.failure_url,
    signature: sig,
  })
  return {
    redirect_url: `https://www.asiapay.iq/PayGate/PaymentPage.aspx?${params.toString()}`,
    provider_ref: input.order_id,
  }
}
```

**Env vars**: `ASIAPAY_MERCHANT_ID`, `ASIAPAY_SECRET`

## Stripe adapter (Visa / Mastercard, international)

Best for: cross-border customers, expat shoppers, international Visa/Mastercard issued anywhere.

Medusa v2 has [an official Stripe payment provider plugin](https://docs.medusajs.com/integrations/payment/stripe) — drop in:

```bash
npm install @medusajs/payment-stripe
```

Register in `medusa-config.ts`:
```ts
modules: [
  // ... your custom modules
  {
    resolve: '@medusajs/payment',
    options: {
      providers: [
        { resolve: '@medusajs/payment-stripe', id: 'stripe', options: { apiKey: process.env.STRIPE_API_KEY } },
      ],
    },
  },
]
```

For **marketplace splits** (commission per tenant): use **Stripe Connect**:
- Each tenant onboards their own Stripe account
- Platform takes a percent on every charge automatically
- Funds settle directly to tenant accounts

## Manual provider (MVP fallback)

Cash on delivery. Already built into Medusa core — just configure in admin:
1. Medusa Admin → Settings → Regions → Iraq → Payment Providers → enable "Manual"
2. Mobile/web checkout calls `POST /store/carts/{id}/complete` — order placed immediately with status `payment_status: not_paid`.
3. Driver collects cash on delivery, vendor marks `payment_status: paid` from vendor portal.

## Recommended rollout

| Phase | Provider | Why |
|---|---|---|
| 1 (week 1) | Manual (cash on delivery) | Already built. Zero integration needed. |
| 2 (week 2-3) | ZainCash | #1 wallet in Iraq, easiest mobile UX. |
| 3 (week 3-4) | QiCard | Government salary cards = huge addressable user base. |
| 4 (week 5+) | Stripe (Visa/MC) | Adds international + premium card support. |
| 5 (future) | AsiaPay | Adds redundancy for IQD card processing if QiCard has downtime. |

## Multi-currency

Iraqi Dinar (IQD, ISO 368) has **no minor units** in the bank, but in our DB we store everything in cents to keep math integer-clean. Display layer converts:
- Backend: `amount_cents: 25000000` (250,000 IQD)
- Display: "250,000 IQD"
- ZainCash API: send `25000000 / 100 = 250000`

Use `Intl.NumberFormat('en-IQ', { style: 'currency', currency: 'IQD', minimumFractionDigits: 0 })` in `PriceText.tsx` when region is Iraq.

## Compliance

- **PCI DSS**: by using ZainCash/QiCard/AsiaPay hosted redirect flows, we never see card numbers — minimal PCI scope (SAQ A).
- **KYC**: each tenant must complete merchant KYC with their payment provider directly. Track status in the Tenant entity.
- **Reconciliation**: each payment writes a `payment_attempt` row (TODO: add to module) with `provider_ref` so we can match Bank statement → order.

## Where this gets wired in code

```
backend/apps/backend/src/modules/payments/
  index.ts                  module registration
  service.ts                adapter registry + facade
  models/payment-attempt.ts append-only ledger
  adapters/
    types.ts                PaymentProvider interface
    manual.ts               cash-on-delivery (no API)
    zaincash.ts             ZainCash OAuth2 + redirect
    qicard.ts               QiCard hosted form
    asiapay.ts              AsiaPay HMAC redirect
    stripe.ts               wrapper around @medusajs/payment-stripe
```

Module scaffold lands in this session as the foundation; real provider credentials + per-tenant Stripe Connect onboarding are a follow-up after you sign business agreements with ZainCash and QiCard.

## TODO checklist

- [ ] Register merchant account at [zaincash.iq](https://zaincash.iq/business/payment-gateway-faq) → get client_id + client_secret + public_key
- [ ] Register merchant at QiCard via [qi.iq/en/home](https://qi.iq/en/home) → get merchant_id + api_key + hmac_secret
- [ ] (Optional) Register at AsiaPay [asiapay.iq](https://www.asiapay.iq/integration)
- [ ] Create Stripe account + Connect onboarding flow for tenants
- [ ] Add env vars to `deploy/.env.prod` + `backend/apps/backend/.env`
- [ ] Build adapter implementations in `src/modules/payments/adapters/`
- [ ] Add `POST /store/carts/{id}/payment-init` route — returns redirect URL
- [ ] Add `POST /store/carts/{id}/payment-callback` route — verifies + completes the order
- [ ] Update mobile checkout to show provider picker (radio: ZainCash | QiCard | Cash on Delivery)
- [ ] Test with sandbox credentials before going live
