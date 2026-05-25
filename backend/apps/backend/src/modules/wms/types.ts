import type { MovementType } from "./models/movement.model"

export type StockSnapshot = {
  on_hand: number;
  reserved: number;
  available: number;
};

export type DecrementStockInput = {
  vendor_id: string;
  variant_id: string;
  qty: number;
  type: MovementType;
  source_id?: string;
  actor_id?: string;
  note?: string;
};

export type DecrementStockResult = {
  new_on_hand: number;
  movement_id: string;
};

export type IncrementStockInput = {
  vendor_id: string;
  variant_id: string;
  qty: number;
  type: MovementType;
  source_id?: string;
  actor_id?: string;
  note?: string;
};

export type IncrementStockResult = {
  new_on_hand: number;
  movement_id: string;
};

export type CreateReservationInput = {
  vendor_id: string;
  order_id: string;
  variant_id: string;
  qty: number;
  ttl_seconds?: number;
};

export type ReservationDTO = {
  id: string;
  vendor_id: string;
  order_id: string;
  variant_id: string;
  qty: number;
  expires_at: Date;
  status: "active" | "consumed" | "released" | "expired";
};

export type ConsumeReservationInput = {
  reservation_id: string;
  actor_id?: string;
  note?: string;
};

export type ReleaseReservationInput = {
  reservation_id: string;
  reason?: string;
};

export type ExpireReservationsResult = {
  expired_count: number;
};

export type WmsServiceInterface = {
  ping(): string;
  getStock(vendorId: string, variantId: string): Promise<StockSnapshot>;
  decrementStock(input: DecrementStockInput): Promise<DecrementStockResult>;
  incrementStock(input: IncrementStockInput): Promise<IncrementStockResult>;
  createReservation(input: CreateReservationInput): Promise<ReservationDTO>;
  consumeReservation(input: ConsumeReservationInput): Promise<{ ok: true }>;
  releaseReservation(input: ReleaseReservationInput): Promise<{ ok: true }>;
  expireReservations(): Promise<ExpireReservationsResult>;
};
