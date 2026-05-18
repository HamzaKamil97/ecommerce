import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { REVIEWS_MODULE } from "../../../../../modules/reviews"
import type ReviewsService from "../../../../../modules/reviews/service"

// GET  /store/reviews/products/{id}     list approved reviews + stats for a product
// POST /store/reviews/products/{id}     submit a review  body: { rating, title?, body?, images?, order_id? }

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(REVIEWS_MODULE) as ReviewsService
  const reviews = await svc.listProductReviews(
    { product_id: req.params.id, status: "approved" },
    { take: 50, order: { created_at: "desc" } as any }
  )
  const stats = await svc.productStats(req.params.id)
  res.json({ reviews, stats })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(REVIEWS_MODULE) as ReviewsService
  const body = (req.body as any) || {}
  const customerId = (req as any).auth_context?.actor_id ?? body.customer_id
  if (!customerId) return res.status(401).json({ error: "Authentication required" })
  if (!body.rating) return res.status(400).json({ error: "rating required" })
  const review = await svc.createProductReview({
    product_id: req.params.id,
    customer_id: customerId,
    rating: body.rating,
    title: body.title,
    body: body.body,
    images: body.images,
    order_id: body.order_id,
  })
  res.status(201).json({ review })
}
