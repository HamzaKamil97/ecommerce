export type StockSnapshot = {
  on_hand: number;
  reserved: number;
  available: number;
};

export type WmsServiceInterface = {
  ping(): string;
  getStock(vendorId: string, variantId: string): Promise<StockSnapshot>;
};
