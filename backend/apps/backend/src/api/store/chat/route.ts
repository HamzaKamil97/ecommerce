import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

// POST /store/chat   body: { messages: [{role,content}], customer_id? }
// Customer support chatbot — RAG over product catalog + shop policies.
// Falls back to canned responses if no AI provider configured.

const KNOWN_INTENTS: Array<{ patterns: RegExp[]; reply: (req?: any) => string }> = [
  {
    patterns: [/hello|hi |hey/i],
    reply: () => "Hi! I can help with orders, products, deliveries, refunds, and account questions. What do you need?",
  },
  {
    patterns: [/delivery|shipping|when|arrive/i],
    reply: () =>
      "Delivery times depend on the shop. Most local shops deliver within 1-3 hours; groceries can be same-day. Check the product page for the estimated delivery window.",
  },
  {
    patterns: [/refund|return|cancel/i],
    reply: () =>
      "You can request a refund or return within 7 days of delivery from your Orders tab. For perishables (food, flowers), please contact the shop directly via the order page.",
  },
  {
    patterns: [/payment|pay|cash|card/i],
    reply: () =>
      "We support cash on delivery and card payments. Some shops also accept wallet balance — top up from your Profile > Wallet.",
  },
  {
    patterns: [/points|loyalty|reward/i],
    reply: () =>
      "You earn 10 points per $1 spent. 1000 points = silver tier, 5000 = gold, 20000 = platinum. Redeem points at checkout for discount.",
  },
  {
    patterns: [/referr|invite|friend/i],
    reply: () =>
      "Share your referral code from Profile > Loyalty. Your friend gets 200 welcome points, and you get 500 points on their first order.",
  },
  {
    patterns: [/contact|human|agent|support/i],
    reply: () =>
      "Tap 'Talk to a human' in the chat to be connected with a support agent. Average wait time is under 2 minutes.",
  },
]

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body as any) || {}
  const messages: Array<{ role: string; content: string }> = body.messages ?? []
  const last = messages[messages.length - 1]?.content ?? ""
  if (!last) return res.json({ reply: "Hi! How can I help you today?", source: "stub" })

  // 1) Try AI provider if configured
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const reply = await callAnthropic(messages)
      return res.json({ reply, source: "anthropic" })
    } catch (e: any) {
      // fall through to canned
    }
  }

  // 2) Pattern match canned intents
  for (const intent of KNOWN_INTENTS) {
    if (intent.patterns.some((re) => re.test(last))) {
      return res.json({ reply: intent.reply(req), source: "rule" })
    }
  }

  // 3) Fallback
  return res.json({
    reply:
      "I'm not sure I understood. Could you rephrase? I can help with orders, deliveries, refunds, loyalty points, and payments.",
    source: "fallback",
  })
}

async function callAnthropic(messages: Array<{ role: string; content: string }>) {
  const system = `You are a friendly customer support assistant for a multi-vendor super-app.
Help with orders, deliveries, refunds, payments, loyalty points, and product questions.
Be concise (max 2 short paragraphs). If asked about a specific order or product, suggest the user open it from the Orders or Shop tab.
Never invent prices or shop names. If unsure, suggest "Talk to a human".`

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 400,
      system,
      messages: messages.map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.content })),
    }),
  })
  if (!res.ok) throw new Error(`anthropic ${res.status}`)
  const data: any = await res.json()
  return data?.content?.[0]?.text ?? "Sorry, I couldn't generate a reply."
}
