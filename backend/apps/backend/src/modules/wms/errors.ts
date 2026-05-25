export class WmsError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "WmsError"
  }
}

export class WmsInsufficientStockError extends WmsError {
  constructor(
    public readonly vendor_id: string,
    public readonly variant_id: string,
    public readonly requested: number,
    public readonly available: number,
  ) {
    super(`Insufficient stock: vendor=${vendor_id} variant=${variant_id} requested=${requested} available=${available}`)
    this.name = "WmsInsufficientStockError"
  }
}
