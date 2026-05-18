import { medusaClient } from './medusaClient';

export interface ProductReview {
  id: string;
  product_id: string;
  customer_id: string;
  rating: number;
  title: string | null;
  body: string | null;
  images: string[] | null;
  is_verified_purchase: boolean;
  vendor_reply: string | null;
  vendor_reply_at: string | null;
  created_at: string;
}

export interface ReviewStats {
  average: number;
  count: number;
  distribution: Record<number, number>;
}

export async function listProductReviews(productId: string): Promise<{ reviews: ProductReview[]; stats: ReviewStats }> {
  const { data } = await medusaClient.get(`/store/reviews/products/${productId}`);
  return {
    reviews: data?.reviews ?? [],
    stats: data?.stats ?? { average: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
  };
}

export async function submitProductReview(
  productId: string,
  input: { customerId: string; rating: number; title?: string; body?: string }
) {
  const { data } = await medusaClient.post(`/store/reviews/products/${productId}`, {
    customer_id: input.customerId,
    rating: input.rating,
    title: input.title,
    body: input.body,
  });
  return data?.review;
}
