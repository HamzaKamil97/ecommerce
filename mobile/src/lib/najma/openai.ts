// Thin OpenAI Chat Completions client for Najma.
// Reads EXPO_PUBLIC_OPENAI_API_KEY at request time so the app boots even
// without a key — chatWithNajma returns { ok:false, error:'no-key' } and the
// UI shows a graceful "launching soon" state.

export type NajmaChatRole = 'system' | 'user' | 'assistant'

export interface NajmaChatMessage {
  role: NajmaChatRole
  content: string
}

export type NajmaChatError = 'no-key' | 'rate-limit' | 'network' | 'unknown'

export interface NajmaChatResult {
  ok: boolean
  reply?: string
  error?: NajmaChatError
  raw?: unknown
}

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'
const MODEL = 'gpt-4o-mini'

export async function chatWithNajma(
  messages: NajmaChatMessage[],
): Promise<NajmaChatResult> {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY
  if (!apiKey || !apiKey.trim()) {
    return { ok: false, error: 'no-key' }
  }

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
        temperature: 0.7,
        max_tokens: 400,
        messages,
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

  const reply =
    (payload as { choices?: { message?: { content?: string } }[] })?.choices?.[0]
      ?.message?.content
  if (!reply || typeof reply !== 'string') {
    return { ok: false, error: 'unknown', raw: payload }
  }

  return { ok: true, reply: reply.trim() }
}
