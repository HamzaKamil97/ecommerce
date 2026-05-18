export interface ProductVariant {
  id: string;
  title: string;
  sku?: string | null;
  prices?: { amount: number; currency_code: string }[];
  calculated_price?: {
    calculated_amount: number;
    original_amount: number;
    currency_code: string;
  };
}

export interface Product {
  id: string;
  title: string;
  handle: string;
  description?: string | null;
  thumbnail?: string | null;
  images?: { id: string; url: string }[];
  variants: ProductVariant[];
}

export type ProductApprovalStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'rejected';
