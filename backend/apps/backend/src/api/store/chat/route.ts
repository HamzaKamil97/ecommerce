import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { AI_MODULE } from "../../../modules/ai"
import type AiService from "../../../modules/ai/service"

// POST /store/chat
//   body: { messages: [{role, content}], customer_id?, location?: { lat, lng } }
//   response: { reply, source, actions?: Array<NavigateAction> }
//
// AI shopping agent. Knows our catalog via semantic search + product hydration.
// Returns structured `actions` the mobile/web app can render as buttons:
//   - { type: "open_product", product_id, title, thumbnail? }
//   - { type: "open_shop", tenant_slug, name }
//   - { type: "add_to_cart", variant_id, title }
//   - { type: "search", query }
//   - { type: "go_to_screen", screen: "wallet" | "loyalty" | "orders" | "cart" }

type Action =
  | { type: "open_product"; product_id: string; title: string; thumbnail?: string }
  | { type: "open_shop"; tenant_slug: string; name: string }
  | { type: "add_to_cart"; variant_id: string; title: string }
  | { type: "search"; query: string }
  | { type: "go_to_screen"; screen: string; label: string }

const KNOWN_INTENTS: Array<{
  patterns: RegExp[]
  reply: () => string
  actions?: () => Action[]
}> = [
  {
    patterns: [/^(hi|hello|hey|salaam|marhaba)/i],
    reply: () => "Hi! I can help you find products, browse shops, track orders, or answer questions. What are you looking for?",
    actions: () => [
      { type: "go_to_screen", screen: "shops", label: "Browse shops" },
      { type: "go_to_screen", screen: "orders", label: "My orders" },
    ],
  },
  {
    patterns: [/wallet|balance|topup|top up/i],
    reply: () => "Your wallet lets you keep a balance for faster checkout and refunds. Want to open it?",
    actions: () => [{ type: "go_to_screen", screen: "wallet", label: "Open wallet" }],
  },
  {
    patterns: [/points|loyalty|reward|tier/i],
    reply: () => "You earn 10 points per $1 spent. Rewards tab shows your tier and lets you share your referral code.",
    actions: () => [{ type: "go_to_screen", screen: "loyalty", label: "Open rewards" }],
  },
  {
    patterns: [/refund|return|cancel/i],
    reply: () => "Refunds are available within 7 days for non-perishables. For food/flowers, contact the shop directly from your order page.",
    actions: () => [{ type: "go_to_screen", screen: "orders", label: "My orders" }],
  },
  {
    patterns: [/delivery|shipping|when|how long|eta/i],
    reply: () => "Most local shops deliver within 1-3 hours. Restaurants are usually 30-60 minutes. Each product shows its estimated window.",
  },
  {
    patterns: [/payment|pay|cash|card|zaincash|qicard/i],
    reply: () => "We accept cash on delivery, ZainCash, Qi Card, AsiaPay (Visa/Mastercard), and international Stripe cards.",
  },
]

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body as any) || {}
  const messages: Array<{ role: string; content: string }> = body.messages ?? []
  const last = messages[messages.length - 1]?.content?.trim() ?? ""
  if (!last) return res.json({ reply: "Hi! How can I help today?", source: "stub", actions: [] })

  const lower = last.toLowerCase()

  // 1) Rule-based intent match (cheap)
  for (const intent of KNOWN_INTENTS) {
    if (intent.patterns.some((re) => re.test(last))) {
      return res.json({
        reply: intent.reply(),
        source: "rule",
        actions: intent.actions?.() ?? [],
      })
    }
  }

  // 2) Catalog-aware lookup — does the user mention something we sell?
  const actions: Action[] = []
  let catalogReply: string | null = null

  // Use semantic search to find up to 3 matching products
  try {
    const ai = req.scope.resolve(AI_MODULE) as AiService
    const hits = await ai.semanticSearch(last, 3)
    if (hits.length > 0) {
      const productModule = req.scope.resolve("product") as any
      const products = await productModule.listProducts(
        { id: hits.map((h) => h.product_id) },
        { take: 3 }
      )
      if (products.length > 0) {
        catalogReply = `I found ${products.length} matching product${products.length > 1 ? "s" : ""}:\n` +
          products.map((p: any) => `• ${p.title}`).join("\n")
        for (const p of products) {
          actions.push({
            type: "open_product",
            product_id: p.id,
            title: p.title,
            thumbnail: p.thumbnail,
          })
        }
      }
    }
  } catch {}

  // 3) If user mentions a shop name, suggest tenants
  try {
    const tenantSvc = req.scope.resolve("tenant") as any
    const tenants = await tenantSvc.listTenants({ approval_status: "approved" })
    const matchingShops = tenants.filter((t: any) => lower.includes(t.name.toLowerCase()) || lower.includes(t.slug))
    for (const shop of matchingShops.slice(0, 2)) {
      actions.push({ type: "open_shop", tenant_slug: shop.slug, name: shop.name })
    }
    if (matchingShops.length > 0 && !catalogReply) {
      catalogReply = `Here ${matchingShops.length === 1 ? "is" : "are"} the matching shop${matchingShops.length > 1 ? "s" : ""}:`
    }
  } catch {}

  if (catalogReply) {
    return res.json({ reply: catalogReply, source: "catalog", actions })
  }

  // 4) Try the real LLM if configured
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const reply = await callAnthropic(messages)
      // Always suggest a search action so user can drill into the catalog
      return res.json({
        reply,
        source: "anthropic",
        actions: [{ type: "search", query: last } as Action],
      })
    } catch {}
  }

  // 5) Fallback
  return res.json({
    reply:
      `I couldn't find anything matching "${last}". Try searching directly, or ask about delivery, payments, rewards, or your orders.`,
    source: "fallback",
    actions: [{ type: "search", query: last }],
  })
}

async function callAnthropic(messages: Array<{ role: string; content: string }>) {
  const system = `You are a friendly shopping assistant inside a multi-vendor super-app (food, groceries, flowers, electronics, fashion, pharmacy, etc.).
Be concise (≤2 short paragraphs). Suggest concrete next steps when possible.
Never invent prices, shop names, or product names.
If unsure, suggest the user search or ask "Talk to a human".`

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
      messages: messages.map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      })),
    }),
  })
  if (!res.ok) throw new Error(`anthropic ${res.status}`)
  const data: any = await res.json()
  return data?.content?.[0]?.text ?? "Sorry, I couldn't generate a reply."
}
