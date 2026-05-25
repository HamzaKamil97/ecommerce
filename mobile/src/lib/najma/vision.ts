// Najma vision client — wraps OpenAI gpt-4o-mini chat-completions vision API.
// Same key-optional pattern as ./openai.ts — if EXPO_PUBLIC_OPENAI_API_KEY is
// missing, returns { ok:false, error:'no-key' } and the UI shows the
// "launching soon" overlay.

export type VisionMode = 'fridge' | 'receipt' | 'photo'

export type VisionError = 'no-key' | 'rate-limit' | 'network' | 'unknown'

export interface VisionItem {
  name: string
  qty?: string
  confidence?: 'high' | 'medium' | 'low'
}

export interface VisionBasketItem {
  productId?: string
  name: string
  reason: string
  priceMinor?: number
}

export interface VisionRequest {
  mode: VisionMode
  // Accepts a data URI (data:image/jpeg;base64,...) OR raw base64. We wrap
  // raw payloads to a data URI before sending.
  imageBase64: string
}

export interface VisionResponse {
  ok: boolean
  mode?: VisionMode
  summary?: string
  items?: VisionItem[]
  suggestedBasket?: VisionBasketItem[]
  error?: VisionError
  raw?: unknown
}

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'
const MODEL = 'gpt-4o-mini'

const SYSTEM_PROMPTS: Record<VisionMode, string> = {
  fridge: [
    "You're Najma, a warm Iraqi shopping concierge inside Hanoot.",
    'The user pointed their camera at a fridge. Identify visible food/drink items.',
    'Reply ONLY as JSON with this shape:',
    '{ "summary": string, "items": [{"name": string, "qty"?: string, "confidence": "high"|"medium"|"low"}],',
    '  "suggestedBasket": [{"name": string, "reason": string}] }',
    'Suggest 3-5 replenishment items from a general Iraqi grocery (FreshMart-style)',
    'that the user likely needs based on what is low or missing. Keep summary 1-2 sentences, warm tone.',
  ].join(' '),
  receipt: [
    "You're Najma, a warm Iraqi shopping concierge inside Hanoot.",
    'The user photographed a paper or digital receipt. Extract the line items.',
    'Reply ONLY as JSON with this shape:',
    '{ "summary": string, "items": [{"name": string, "qty"?: string}] }',
    'Keep summary 1-2 sentences. If the receipt is unreadable, return an empty items array',
    'and explain politely in the summary.',
  ].join(' '),
  photo: [
    "You're Najma, a warm Iraqi shopping concierge inside Hanoot.",
    'The user photographed a single product. Identify it.',
    'Reply ONLY as JSON with this shape:',
    '{ "summary": string, "items": [{"name": string}],',
    '  "suggestedBasket": [{"name": string, "reason": string}] }',
    'Provide 3-4 similar items the user might also like from a general Iraqi catalog.',
    'Keep summary 1-2 sentences, warm tone.',
  ].join(' '),
}

function toDataUri(b64: string): string {
  if (b64.startsWith('data:')) return b64
  return `data:image/jpeg;base64,${b64}`
}

function safeParseJson(s: string): unknown {
  // Models sometimes wrap JSON in ```json fences despite response_format. Strip them.
  const trimmed = s.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '')
  try {
    return JSON.parse(trimmed)
  } catch {
    return null
  }
}

export async function najmaVision(req: VisionRequest): Promise<VisionResponse> {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY
  if (!apiKey || !apiKey.trim()) {
    return { ok: false, error: 'no-key' }
  }

  const dataUri = toDataUri(req.imageBase64)

  let res: Response
  try {
    res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.4,
        max_tokens: 600,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPTS[req.mode] },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Analyze this image per the instructions and return strict JSON.' },
              { type: 'image_url', image_url: { url: dataUri } },
            ],
          },
        ],
      }),
    })
  } catch (err) {
    return { ok: false, error: 'network', raw: err }
  }

  if (res.status === 429) {
    return { ok: false, error: 'rate-limit' }
  }

  let payload: unknown
  try {
    payload = await res.json()
  } catch (err) {
    return { ok: false, error: 'unknown', raw: err }
  }

  if (!res.ok) {
    return { ok: false, error: 'unknown', raw: payload }
  }

  const content =
    (payload as { choices?: { message?: { content?: string } }[] })?.choices?.[0]
      ?.message?.content
  if (!content || typeof content !== 'string') {
    return { ok: false, error: 'unknown', raw: payload }
  }

  const parsed = safeParseJson(content) as
    | {
        summary?: string
        items?: VisionItem[]
        suggestedBasket?: VisionBasketItem[]
      }
    | null
  if (!parsed) {
    return { ok: false, error: 'unknown', raw: content }
  }

  return {
    ok: true,
    mode: req.mode,
    summary: parsed.summary,
    items: Array.isArray(parsed.items) ? parsed.items : [],
    suggestedBasket: Array.isArray(parsed.suggestedBasket) ? parsed.suggestedBasket : [],
    raw: parsed,
  }
}
