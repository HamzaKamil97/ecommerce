import { render, screen, waitFor } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { OrderStatusStrip } from "../OrderStatusStrip"
import { getOnlineOrderStatus } from "@lib/data/online-orders"

// The strip reads status via a server action; mock that module.
vi.mock("@lib/data/online-orders", () => ({
  getOnlineOrderStatus: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(getOnlineOrderStatus).mockResolvedValue({ status: "accepted" })
})

describe("OrderStatusStrip", () => {
  it("renders the accepted label after the status loads", async () => {
    render(<OrderStatusStrip orderId="order_1" />)
    await waitFor(() => expect(screen.getByTestId("order-status-strip")).toHaveTextContent(/preparing/i))
  })

  it("renders nothing until a status is available", async () => {
    vi.mocked(getOnlineOrderStatus).mockResolvedValue(null)
    render(<OrderStatusStrip orderId="order_2" />)
    // Give the immediate poll a tick; strip stays absent on null.
    await new Promise((r) => setTimeout(r, 50))
    expect(screen.queryByTestId("order-status-strip")).toBeNull()
  })
})
