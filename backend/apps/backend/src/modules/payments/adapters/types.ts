export interface InitiateInput {
  order_id?: string
  cart_id?: string
  amount_cents: number
  currency: string         // ISO 4217, e.g. "IQD" | "USD" | "EUR"
  customer_email?: string
  customer_phone?: string
  success_url: string
  failure_url: string
}

export interface InitiateOutput {
  redirect_url?: string
  client_token?: string    // for Stripe Elements / SDK flows
  provider_ref: string
  status?: "initiated" | "pending_user_action"
}

export interface VerifyInput {
  jwt?: string
  signature?: string
  provider_ref: string
  raw_body?: any
}

export interface VerifyOutput {
  ok: boolean
  amount_cents: number
  error?: string
}

export interface RefundInput {
  provider_ref: string
  amount_cents: number
}

export interface RefundOutput {
  ok: boolean
  error?: string
}

export interface PaymentProvider {
  readonly id: string
  readonly label: string
  readonly icon_url?: string
  readonly accepted_currencies: string[]

  initiate(input: InitiateInput): Promise<InitiateOutput>
  verify(input: VerifyInput): Promise<VerifyOutput>
  refund(input: RefundInput): Promise<RefundOutput>
}
