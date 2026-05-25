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

export type UpsertShopLocationInput = {
  vendor_id: string;
  lat: number;
  lng: number;
  delivery_radius_km: number;
  address_text?: string;
};

export type ShopsWithinRadiusInput = {
  lat: number;
  lng: number;
  radius_km: number;
};

export type ShopLocationResult = {
  vendor_id: string;
  lat: number;
  lng: number;
  delivery_radius_km: number;
  distance_km: number;
};

export type DriftFlag = "negative_on_hand" | "reserved_exceeds_on_hand";

export type DriftReport = {
  flagged: Array<{
    vendor_id: string;
    variant_id: string;
    on_hand: number;
    reserved: number;
    flag: DriftFlag;
  }>;
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
  upsertShopLocation(input: UpsertShopLocationInput): Promise<{ ok: true }>;
  shopsWithinRadius(input: ShopsWithinRadiusInput): Promise<ShopLocationResult[]>;
  detectStockDrift(input: { vendor_id?: string }): Promise<DriftReport>;
};
