"use client"
// Client component — reads itemCount from the client-side CartProvider.
// The Medusa server-side cart (passed as prop from parent) is retained for
// eventual checkout use (Phase 7) but item count now reflects client cart state.
import CartFab from "./index"
import { useCart } from "@lib/context/cart-context"

interface Props {
  // cart prop kept for API compatibility with parent layout; unused here until Phase 7
  cart?: unknown
  countryCode: string
}

export default function CartFabWrapper({ countryCode }: Props) {
  const { itemCount } = useCart()
  return <CartFab itemCount={itemCount} countryCode={countryCode} />
}
