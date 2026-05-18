import { model } from "@medusajs/framework/utils"

// Stores semantic-search vectors per product.
// For real usage, install the pgvector extension and convert `embedding` to a vector column.
// For now we store as JSON (array of floats) — works without pgvector, slower for large catalogs.
export const ProductEmbedding = model.define("product_embedding", {
  id: model.id().primaryKey(),
  product_id: model.text().searchable(),
  model_name: model.text(), // e.g., "text-embedding-3-small" or "claude-embed-v1"
  dim: model.number(),       // vector dimensionality
  embedding: model.json(),   // number[] — replace with pgvector column for real perf
  source_text: model.text().nullable(), // the text that was embedded
}).indexes([
  { on: ["product_id", "model_name"], unique: true },
])
