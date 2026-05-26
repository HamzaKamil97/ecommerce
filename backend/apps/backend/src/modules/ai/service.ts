import { MedusaService } from "@medusajs/framework/utils"
import { ProductEmbedding } from "./models/product-embedding"

// LLM providers — pluggable. Default is "stub" so the system works without any external API keys.
type Provider = "stub" | "anthropic" | "openai"

class AiService extends MedusaService({
  ProductEmbedding,
}) {
  private provider: Provider =
    (process.env.AI_PROVIDER as Provider) ||
    (process.env.ANTHROPIC_API_KEY ? "anthropic" : process.env.OPENAI_API_KEY ? "openai" : "stub")

  // ===== Description generation =====

  /**
   * Generate a product description from title + bullet points (+ optional image URLs).
   * Tenant voice/tone guide can be passed for white-label brand consistency.
   */
  async generateDescription(input: {
    title: string
    bullets?: string[]
    image_urls?: string[]
    tenant_voice?: string
    target_words?: number
  }): Promise<{ description: string; provider: Provider }> {
    if (this.provider === "stub") {
      return {
        provider: "stub",
        description:
          [
            `Discover ${input.title} — a thoughtfully curated pick.`,
            input.bullets?.length ? input.bullets.map((b) => `• ${b}`).join(" ") : "",
            "Backed by our quality guarantee.",
          ]
            .filter(Boolean)
            .join("\n"),
      }
    }

    if (this.provider === "anthropic") {
      return this._anthropicDescribe(input)
    }
    if (this.provider === "openai") {
      return this._openaiDescribe(input)
    }
    throw new Error(`Unknown AI provider: ${this.provider}`)
  }

  private async _anthropicDescribe(input: {
    title: string
    bullets?: string[]
    tenant_voice?: string
    target_words?: number
  }): Promise<{ description: string; provider: Provider }> {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set")
    const target = input.target_words ?? 80
    const prompt = [
      input.tenant_voice ? `Brand voice: ${input.tenant_voice}` : "",
      `Write a ${target}-word product description for an ecommerce listing.`,
      `Product: ${input.title}`,
      input.bullets?.length ? `Key facts:\n${input.bullets.map((b) => "- " + b).join("\n")}` : "",
      "Plain prose, no headers, no markdown. Focus on benefits, not features.",
    ]
      .filter(Boolean)
      .join("\n\n")

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 600,
        messages: [{ role: "user", content: prompt }],
      }),
    })
    if (!res.ok) throw new Error(`anthropic error ${res.status}: ${await res.text()}`)
    const data: any = await res.json()
    return { description: data?.content?.[0]?.text ?? "", provider: "anthropic" }
  }

  private async _openaiDescribe(input: {
    title: string
    bullets?: string[]
    tenant_voice?: string
    target_words?: number
  }): Promise<{ description: string; provider: Provider }> {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error("OPENAI_API_KEY not set")
    const target = input.target_words ?? 80
    const messages = [
      { role: "system", content: input.tenant_voice ?? "You are a concise ecommerce copywriter." },
      {
        role: "user",
        content:
          `Write a ${target}-word product description.\nTitle: ${input.title}\n` +
          (input.bullets?.length ? `Bullets:\n${input.bullets.map((b) => "- " + b).join("\n")}\n` : "") +
          "Plain prose only.",
      },
    ]
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ model: "gpt-4o-mini", messages, max_tokens: 600 }),
    })
    if (!res.ok) throw new Error(`openai error ${res.status}: ${await res.text()}`)
    const data: any = await res.json()
    return { description: data?.choices?.[0]?.message?.content ?? "", provider: "openai" }
  }

  // ===== Category classification (key-optional) =====

  /**
   * Pick the best category handle for a product name from the allowed list.
   * key-optional: returns { category_handle: 'other', confidence: 0 } when no key is configured
   * or when the upstream call fails for any reason.
   */
  async classifyProductCategory(
    name: string,
    hint: string | undefined,
    allowed: string[],
  ): Promise<{ category_handle: string; confidence: number }> {
    if (!allowed.length) throw new Error('allowed list must be non-empty');
    const key = process.env.OPENAI_API_KEY;
    if (!key) return { category_handle: 'other', confidence: 0 };

    const prompt =
      `Classify the retail product name into ONE of: ${allowed.join(', ')}.\n` +
      `Name: ${name}\n` +
      (hint ? `Hint: ${hint}\n` : '') +
      `Respond as compact JSON: {"category_handle":"<one of the list>","confidence":<0..1>}`;

    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          max_tokens: 60,
        }),
      });
      if (!res.ok) return { category_handle: 'other', confidence: 0 };
      const json: any = await res.json();
      const txt = json?.choices?.[0]?.message?.content ?? '{}';
      const parsed = JSON.parse(txt);
      const handle = allowed.includes(parsed.category_handle) ? parsed.category_handle : 'other';
      const conf = Math.max(0, Math.min(1, Number(parsed.confidence ?? 0)));
      return { category_handle: handle, confidence: conf };
    } catch {
      return { category_handle: 'other', confidence: 0 };
    }
  }

  // ===== Auto-categorization (stub) =====

  async suggestCategorization(input: {
    title: string
    description?: string
    image_urls?: string[]
  }): Promise<{ category_handle: string; tags: string[]; confidence: number; provider: Provider }> {
    const text = (input.title + " " + (input.description ?? "")).toLowerCase()
    const rules: Array<[string, RegExp]> = [
      ["food", /\b(pizza|burger|sushi|croissant|sandwich|meal|coffee|tea|bread|pastry)\b/],
      ["flowers", /\b(roses?|tulip|bouquet|orchid|lily|flower|bloom)\b/],
      ["vegetables", /\b(carrot|tomato|lettuce|spinach|cucumber|veggie|vegetable|organic)\b/],
      ["electronics", /\b(headphones?|charger|cable|laptop|phone|earbuds?|speaker|power\s?bank|usb)\b/],
      ["fashion", /\b(t-?shirt|tee|jacket|jean|pants?|dress|hoodie|sneaker|shoe|denim|cotton)\b/],
    ]
    for (const [handle, re] of rules) {
      if (re.test(text)) {
        return {
          category_handle: handle,
          tags: text.match(re)?.slice(0, 3) ?? [],
          confidence: 0.7,
          provider: "stub",
        }
      }
    }
    return { category_handle: "general", tags: [], confidence: 0.2, provider: "stub" }
  }

  // ===== Embeddings + semantic search =====

  /**
   * Stub embed: produces a deterministic pseudo-vector by hashing tokens.
   * For real use, swap to OpenAI or local sentence-transformers.
   */
  private _stubEmbed(text: string, dim = 64): number[] {
    const v = new Array(dim).fill(0)
    for (const tok of text.toLowerCase().match(/\w+/g) ?? []) {
      let h = 2166136261
      for (let i = 0; i < tok.length; i++) {
        h ^= tok.charCodeAt(i)
        h = (h * 16777619) >>> 0
      }
      v[h % dim] += 1
    }
    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1
    return v.map((x) => x / norm)
  }

  async embedText(text: string): Promise<{ embedding: number[]; model_name: string; dim: number }> {
    // Replace with OpenAI text-embedding-3-small or local sentence-transformers in production.
    const embedding = this._stubEmbed(text, 64)
    return { embedding, model_name: "stub-hash-v1", dim: embedding.length }
  }

  async indexProduct(productId: string, sourceText: string) {
    const e = await this.embedText(sourceText)
    const existing = await this.listProductEmbeddings({ product_id: productId, model_name: e.model_name })
    if (existing.length > 0) {
      return (this as any).updateProductEmbeddings({
        id: existing[0].id,
        embedding: e.embedding as any,
        dim: e.dim,
        source_text: sourceText,
      })
    }
    return (this as any).createProductEmbeddings({
      product_id: productId,
      model_name: e.model_name,
      dim: e.dim,
      embedding: e.embedding as any,
      source_text: sourceText,
    })
  }

  async semanticSearch(query: string, limit = 20): Promise<{ product_id: string; score: number }[]> {
    const q = await this.embedText(query)
    const all = await this.listProductEmbeddings({ model_name: q.model_name })
    const scored = all.map((row: any) => {
      const v = row.embedding as number[]
      let dot = 0
      const n = Math.min(v.length, q.embedding.length)
      for (let i = 0; i < n; i++) dot += v[i] * q.embedding[i]
      return { product_id: row.product_id, score: dot }
    })
    scored.sort((a, b) => b.score - a.score)
    return scored.slice(0, limit)
  }
}

export default AiService
