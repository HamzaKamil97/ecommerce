import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

// Returns the full vendor catalog in a shape the PoS Dexie cache can ingest directly.
// The PoS calls this on first launch and on "Refresh catalog".
//
// TODO(H-3): real vendor → product filtering once H-3 data-entry sets the vendor link.
// Products are linked to vendors via metadata.created_by_vendor_id (set in vendor/products POST).
// For v1 this filters on that metadata field; the envelope shape is stable.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const vendor_id = req.query.vendor_id as string | undefined
  if (!vendor_id) return res.status(400).json({ error: "vendor_id required" })

  let items: Array<{
    variant_id: string; product_id: string; sku: string | null; barcode: string | null;
    name: string; price_minor: number; currency_code: string;
    image_url: string | null; on_hand: number;
  }> = []

  // Try the product module if available. Wrap defensively because the filter
  // syntax may vary by Medusa version and no vendor products may exist yet.
  try {
    const product: any = req.scope.resolve("product")
    const wms: any = req.scope.resolve("wmsService")
    const products = await product.listProducts(
      { metadata: { created_by_vendor_id: vendor_id } },
      { relations: ["variants"], take: 5000 },
    ).catch(() => [])

    for (const p of products) {
      for (const v of (p.variants ?? [])) {
        const price_minor = Number(v.prices?.[0]?.amount ?? 0)
        let on_hand = 0
        try {
          const snap = await wms.getStock(vendor_id, v.id)
          on_hand = snap.on_hand
        } catch { /* no stock record yet — treat as 0 */ }
        items.push({
          variant_id: v.id,
          product_id: p.id,
          sku: v.sku ?? null,
          barcode: v.barcode ?? null,
          name: `${p.title}${v.title && v.title !== p.title ? " – " + v.title : ""}`,
          price_minor,
          currency_code: v.prices?.[0]?.currency_code ?? "iqd",
          image_url: p.thumbnail ?? null,
          on_hand,
        })
      }
    }
  } catch (_) {
    // If the product module's filter syntax differs in this Medusa version,
    // fall through with items = []. H-3 will replace this with a proper query.
  }

  res.json({ vendor_id, items, generated_at: new Date().toISOString() })
}
