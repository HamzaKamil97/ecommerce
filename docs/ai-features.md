# AI Features Roadmap

Ordered by ROI for a multi-category marketplace + white-label platform. Pick a phase to lock scope.

## Phase A — first AI release (highest ROI, lowest cost)

### 1. Semantic product search
- **Why**: Beats keyword search dramatically. "comfortable office chair" → finds "ergonomic desk seat". Critical when products cross categories with different terminology.
- **Stack**:
  - Embeddings: OpenAI `text-embedding-3-small` (cheap, fast) OR local `sentence-transformers/all-MiniLM-L6-v2` (free, runs in a Medusa subscriber).
  - Storage: Postgres + **pgvector** extension on a `product_embeddings` table.
  - Search: cosine similarity, fallback to Medusa's keyword search.
- **Trigger**: Medusa subscriber on `product.created` / `product.updated` → embeds title + description → upserts into `product_embeddings`.
- **API**: new `GET /store/products/search?q=...` that does vector + keyword hybrid.
- **Effort**: ~2 days.

### 2. AI-generated product descriptions
- **Why**: Removes #1 vendor onboarding friction. Vendor uploads photos + 3 bullet points → AI drafts the full description in the shop's voice.
- **Stack**: Anthropic Claude Haiku (cheap, fast) or OpenAI GPT-4o-mini. Use Claude prompt caching for the shop's style guide.
- **API**: `POST /admin/products/{id}/draft-description` with optional photos + bullets → returns draft (vendor reviews, edits, saves).
- **Tenant-aware**: prompt includes tenant's voice/tone guide stored on the Tenant entity.
- **Effort**: ~1 day.

### 3. Auto-categorization & tagging
- **Why**: Vendors guess wrong / forget tags. AI suggests category + tags from title + photos.
- **Stack**: Claude Haiku vision OR a smaller image classifier (CLIP) for category; LLM for tag list.
- **API**: `POST /admin/products/{id}/suggest-categorization` returns `{ category_id, tags[] }` with confidence.
- **Effort**: ~1 day.

### 4. Vision moderation in approval workflow
- **Why**: Ties into existing `approval_status` design (see `approval-design.md`). AI pre-flags risky uploads so reviewers focus on edge cases.
- **Checks**: NSFW, weapons, counterfeit luxury, mismatched title/photo, duplicate listings.
- **Stack**: Claude Sonnet vision OR a moderation API (OpenAI Moderation, AWS Rekognition).
- **Trigger**: `product.submitted_for_review` event → calls moderation → writes `auto_review_flags` field → reviewer sees flags in dashboard.
- **Effort**: ~1–2 days.

## Phase B — second iteration

### 5. Image-based search
- "Find products that look like this photo."
- CLIP embeddings stored alongside text embeddings.
- Especially valuable for fashion, decor, flowers.

### 6. Customer support chatbot
- RAG over product catalog + shop policies + order status.
- Anthropic Claude with prompt caching for the policy doc.
- Cuts customer support tickets ~30%+.

### 7. Personalized recommendations
- "You might also like" / "Frequently bought together"
- Collaborative filtering (Postgres + simple matrix factorization) for cold start, LLM-based reranking for personalization.

### 8. Auto-translation
- Tenant lists products in one language; auto-translate to others.
- Matters when going regional (GCC, Europe).
- Claude Haiku per-product, cached.

## Phase C — operational AI

### 9. Dynamic pricing hints (for vendors)
- "Similar products sell for $X — your price is 20% higher."
- Pulls from Medusa internal catalog + optional scraped market data.

### 10. Demand forecasting
- "Reorder before Friday — you'll run out by Monday."
- Simple time-series on order data per SKU.

### 11. Fraud / suspicious-order detection
- Score orders on signup age, shipping mismatch, velocity.
- LLM judge for edge cases.

### 12. Voice search (mobile)
- Speech-to-text → LLM intent extraction → semantic search.

### 13. Visual try-on (AR)
- Fashion / glasses / decor. Heavy. Phase C+ at earliest.

## Tenant-aware prompting

For dedicated-tier tenants, every LLM call includes the tenant's:
- Voice/tone guide (saved on Tenant entity)
- Forbidden words / brand restrictions
- Target customer persona

Use **Anthropic prompt caching** to keep the tenant context block in cache and only pay for the new user content per call.

## Cost model (rough, Phase A only)

Assuming 10k products, 100 vendor product creates/day, 1k searches/day:
- Embeddings (one-time per product update): ~$0.01 / 1k tokens × 1k tokens avg = $0.10 / 10k products
- Description drafts: ~$0.001 each × 100/day = $0.10/day = $3/month
- Categorization: ~$0.001 each × 100/day = $3/month
- Moderation (vision): ~$0.005 each × 100/day = $15/month

**Phase A total: ~$25/month for moderate traffic.** Scales linearly.

## Decisions still open

- **Which LLM provider?** Recommend starting with Anthropic Claude (Haiku/Sonnet) for vision + text. Switch later if pricing or capability needs change.
- **Self-host embeddings vs OpenAI?** Self-hosted is free at scale but adds ops. Start with OpenAI, migrate if cost matters.
- **pgvector vs dedicated vector DB?** pgvector is fine up to ~1M products. Switch to Pinecone/Qdrant only if needed.
