import { MedusaService } from "@medusajs/framework/utils"
import { ProductReview } from "./models/product-review"
import { ShopReview } from "./models/shop-review"

class ReviewsService extends MedusaService({
  ProductReview,
  ShopReview,
}) {
  async createProductReview(input: {
    product_id: string
    customer_id: string
    order_id?: string
    rating: number
    title?: string
    body?: string
    images?: string[]
    is_verified_purchase?: boolean
  }) {
    if (input.rating < 1 || input.rating > 5) throw new Error("rating must be 1-5")
    return (this as any).createProductReviews({
      ...input,
      images: input.images ?? null,
      title: input.title ?? null,
      body: input.body ?? null,
      order_id: input.order_id ?? null,
      is_verified_purchase: input.is_verified_purchase ?? false,
    })
  }

  async productStats(productId: string) {
    const reviews = await this.listProductReviews({ product_id: productId, status: "approved" })
    if (!reviews.length) return { average: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } }
    const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<number, number>
    let sum = 0
    for (const r of reviews) {
      dist[r.rating] = (dist[r.rating] ?? 0) + 1
      sum += r.rating
    }
    return { average: +(sum / reviews.length).toFixed(2), count: reviews.length, distribution: dist }
  }

  async shopStats(tenantId: string) {
    const reviews = await this.listShopReviews({ tenant_id: tenantId, status: "approved" })
    if (!reviews.length) return { average: 0, count: 0 }
    const sum = reviews.reduce((a, r) => a + r.rating, 0)
    return { average: +(sum / reviews.length).toFixed(2), count: reviews.length }
  }

  async vendorReply(reviewId: string, reply: string) {
    return (this as any).updateProductReviews({
      id: reviewId,
      vendor_reply: reply,
      vendor_reply_at: new Date(),
    })
  }
}

export default ReviewsService
