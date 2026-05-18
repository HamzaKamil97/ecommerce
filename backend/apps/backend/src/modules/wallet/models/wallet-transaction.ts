import { model } from "@medusajs/framework/utils"

// Append-only ledger. Balance is computed from transaction sum (or denormalized on Wallet for speed).
export const WalletTransaction = model.define("wallet_transaction", {
  id: model.id().primaryKey(),
  wallet_id: model.text().searchable(),
  amount_cents: model.number(),       // positive = credit, negative = debit
  currency_code: model.text(),
  type: model.enum([
    "topup",
    "refund",
    "purchase",
    "promo_credit",
    "referral_bonus",
    "loyalty_redeem",
    "manual_adjustment",
  ]),
  reference_type: model.text().nullable(), // "order", "promo", etc.
  reference_id: model.text().nullable(),
  description: model.text().nullable(),
  balance_after_cents: model.number(),
}).indexes([
  { on: ["wallet_id"] },
  { on: ["type"] },
  { on: ["reference_id"] },
])
