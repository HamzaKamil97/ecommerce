import { buildOnlineOrderPayload } from "../build-online-order-payload"

describe("buildOnlineOrderPayload", () => {
  const shop = { id: "ten_1", commission_rate_bps: 700 }
  const lines = [
    { variant_id: "v1", title: "Pizza", quantity: 2, unit_price: 5000 },
    { variant_id: "v2", title: "Cola", quantity: 1, unit_price: 1000 },
  ]
  const ctx = {
    customer_id: "cus_1", customer_name: "Sara", customer_phone: "0770",
    currency_code: "iqd" as const, medusa_order_id: "order_1", display_id: "7",
    delivery_address: "Karrada", delivery_lat: null, delivery_lng: null,
  }

  it("maps lines and computes minor totals", () => {
    const p = buildOnlineOrderPayload(shop, lines, ctx)
    expect(p.vendor_id).toBe("ten_1")
    expect(p.lines).toEqual([
      { variant_id: "v1", title: "Pizza", qty: 2, unit_price_minor: 5000, line_total_minor: 10000 },
      { variant_id: "v2", title: "Cola", qty: 1, unit_price_minor: 1000, line_total_minor: 1000 },
    ])
    expect(p.total_minor).toBe(11000)
  })

  it("computes commission from bps (7% of 11000 = 770)", () => {
    const p = buildOnlineOrderPayload(shop, lines, ctx)
    expect(p.commission_rate_bps_snapshot).toBe(700)
    expect(p.commission_minor).toBe(770)
  })

  it("defaults commission bps to 700 when shop has none", () => {
    const p = buildOnlineOrderPayload({ id: "ten_1" }, lines, ctx)
    expect(p.commission_rate_bps_snapshot).toBe(700)
  })

  it("rounds fractional prices to whole minor (IQD has no sub-units)", () => {
    const p = buildOnlineOrderPayload(shop, [{ variant_id: "v1", title: "X", quantity: 3, unit_price: 333.4 }], ctx)
    expect(p.lines[0].unit_price_minor).toBe(333)
    expect(p.lines[0].line_total_minor).toBe(999)
  })

  it("handles an empty lines array (zero totals — documents the edge case)", () => {
    const p = buildOnlineOrderPayload(shop, [], ctx)
    expect(p.lines).toEqual([])
    expect(p.total_minor).toBe(0)
    expect(p.commission_minor).toBe(0)
  })
})
