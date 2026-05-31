import { render, screen, waitFor } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { OrderStatusStrip } from "../OrderStatusStrip"

beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true, json: async () => ({ status: "accepted" }),
  }) as any
})

describe("OrderStatusStrip", () => {
  it("renders the accepted label after fetch", async () => {
    render(<OrderStatusStrip orderId="order_1" />)
    await waitFor(() => expect(screen.getByTestId("order-status-strip")).toHaveTextContent(/preparing/i))
  })
})
