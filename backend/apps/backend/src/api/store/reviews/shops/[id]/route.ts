import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { REVIEWS_MODULE } from "../../../../../modules/reviews"
import type ReviewsService from "../../../../../modules/reviews/service"

// GET  /store/reviews/shops/{id}    list approved shop reviews + stats
// POST /store/reviews/shops/{id}    customer submits shop review

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(REVIEWS_MODULE) as ReviewsService
  const reviews = await svc.listShopReviews(
    { tenant_id: req.params.id, status: "approved" },
    { take: 50, order: { created_at: "desc" } as any }
  )
  const stats = await svc.shopStats(req.params.id)
  res.json({ reviews, stats })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(REVIEWS_MODULE) as ReviewsService
  const body = (req.body as any) || {}
  const customerId = (req as any).auth_context?.actor_id ?? body.customer_id
  if (!customerId) return res.status(401).json({ error: "Authentication required" })
  if (!body.rating) return res.status(400).json({ error: "rating required" })
  const review = await (svc as any).createShopReviews({
    tenant_id: req.params.id,
    customer_id: customerId,
    rating: body.rating,
    delivery_rating: body.delivery_rating ?? null,
    packaging_rating: body.packaging_rating ?? null,
    accuracy_rating: body.accuracy_rating ?? null,
    body: body.body ?? null,
    order_id: body.order_id ?? null,
  })
  res.status(201).json({ review })
}
