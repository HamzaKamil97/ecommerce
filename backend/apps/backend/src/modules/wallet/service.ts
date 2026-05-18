import { MedusaService } from "@medusajs/framework/utils"
import { Wallet } from "./models/wallet"
import { WalletTransaction } from "./models/wallet-transaction"

type TxnType = "topup" | "refund" | "purchase" | "promo_credit" | "referral_bonus" | "loyalty_redeem" | "manual_adjustment"

class WalletService extends MedusaService({
  Wallet,
  WalletTransaction,
}) {
  async getOrCreate(customerId: string, currencyCode = "usd") {
    const [existing] = await this.listWallets({ customer_id: customerId, currency_code: currencyCode })
    if (existing) return existing
    return (this as any).createWallets({
      customer_id: customerId,
      currency_code: currencyCode,
      balance_cents: 0,
    })
  }

  async credit(customerId: string, amountCents: number, type: TxnType, refType?: string, refId?: string, description?: string, currencyCode = "usd") {
    if (amountCents <= 0) throw new Error("credit amount must be > 0")
    const wallet = await this.getOrCreate(customerId, currencyCode)
    if (wallet.is_frozen) throw new Error("wallet frozen")
    const newBalance = wallet.balance_cents + amountCents
    await (this as any).updateWallets({ id: wallet.id, balance_cents: newBalance })
    await (this as any).createWalletTransactions({
      wallet_id: wallet.id,
      amount_cents: amountCents,
      currency_code: currencyCode,
      type,
      reference_type: refType ?? null,
      reference_id: refId ?? null,
      description: description ?? null,
      balance_after_cents: newBalance,
    })
    return { wallet_id: wallet.id, balance_cents: newBalance }
  }

  async debit(customerId: string, amountCents: number, type: TxnType, refType?: string, refId?: string, description?: string, currencyCode = "usd") {
    if (amountCents <= 0) throw new Error("debit amount must be > 0")
    const wallet = await this.getOrCreate(customerId, currencyCode)
    if (wallet.is_frozen) throw new Error("wallet frozen")
    if (wallet.balance_cents < amountCents) throw new Error("insufficient balance")
    const newBalance = wallet.balance_cents - amountCents
    await (this as any).updateWallets({ id: wallet.id, balance_cents: newBalance })
    await (this as any).createWalletTransactions({
      wallet_id: wallet.id,
      amount_cents: -amountCents,
      currency_code: currencyCode,
      type,
      reference_type: refType ?? null,
      reference_id: refId ?? null,
      description: description ?? null,
      balance_after_cents: newBalance,
    })
    return { wallet_id: wallet.id, balance_cents: newBalance }
  }

  async getBalance(customerId: string, currencyCode = "usd") {
    const [wallet] = await this.listWallets({ customer_id: customerId, currency_code: currencyCode })
    return wallet ? wallet.balance_cents : 0
  }

  async listTransactions(customerId: string, limit = 100, currencyCode = "usd") {
    const [wallet] = await this.listWallets({ customer_id: customerId, currency_code: currencyCode })
    if (!wallet) return []
    return this.listWalletTransactions(
      { wallet_id: wallet.id },
      { take: limit, order: { created_at: "desc" } as any }
    )
  }
}

export default WalletService
