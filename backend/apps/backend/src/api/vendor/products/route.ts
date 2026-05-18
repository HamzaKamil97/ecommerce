import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveVendorContext } from "../_helpers"
import { APPROVAL_MODULE } from "../../../modules/approval"
import type ApprovalService from "../../../modules/approval/service"

// GET  /vendor/products              list this vendor's products
// POST /vendor/products              create product in this vendor's tenant (sales channel scoped)
//   body: { title, description?, thumbnail?, status?, variants[] }

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const ctx = await resolveVendorContext(req, res)
  if (!ctx) return
  if (!ctx.tenant.sales_channel_id) {
    return res.json({ products: [], count: 0, note: "tenant has no sales_channel_id yet" })
  }
  const productModule = req.scope.resolve("product") as any
  const products = await productModule.listProducts(
    { sales_channels: { id: [ctx.tenant.sales_channel_id] } },
    { take: 100 }
  )

  // Attach approval status for each product
  const approval = req.scope.resolve(APPROVAL_MODULE) as ApprovalService
  const enriched = await Promise.all(
    products.map(async (p: any) => {
      const a = await approval.getApproval(p.id)
      return { ...p, approval: a }
    })
  )
  res.json({ products: enriched, count: enriched.length })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const ctx = await resolveVendorContext(req, res)
  if (!ctx) return
  if (!ctx.tenant.sales_channel_id) {
    return res.status(400).json({ error: "tenant has no sales_channel_id assigned" })
  }
  const body = (req.body as any) || {}
  if (!body.title) return res.status(400).json({ error: "title is required" })

  const productModule = req.scope.resolve("product") as any
  const product = await productModule.createProducts({
    title: body.title,
    description: body.description ?? null,
    thumbnail: body.thumbnail ?? null,
    handle: body.handle,
    status: body.status ?? "draft",
    metadata: { ...(body.metadata ?? {}), created_by_vendor_id: ctx.vendor.id },
    sales_channels: [{ id: ctx.tenant.sales_channel_id }],
    options: body.options ?? [{ title: "Default", values: ["Default"] }],
    variants: body.variants ?? [
      {
        title: "Default",
        sku: body.sku ?? null,
        manage_inventory: body.manage_inventory ?? false,
        prices: body.prices ?? [],
        options: { Default: "Default" },
      },
    ],
  })

  res.status(201).json({ product })
}
