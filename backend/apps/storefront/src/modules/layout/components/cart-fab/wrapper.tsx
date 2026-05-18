// Server component — reads cart count from the already-fetched cart and
// passes it down to the client CartFab. No extra fetch needed.
import CartFab from "./index"
import { HttpTypes } from "@medusajs/types"

interface Props {
  cart: HttpTypes.StoreCart | null | undefined
  countryCode: string
}

export default function CartFabWrapper({ cart, countryCode }: Props) {
  const itemCount = cart?.items?.length ?? 0
  return <CartFab itemCount={itemCount} countryCode={countryCode} />
}
