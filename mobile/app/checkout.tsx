import { useEffect, useState } from "react"
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
} from "react-native"
import { StatusBar } from "expo-status-bar"
import { useRouter } from "expo-router"
import { useCartStore } from "@/src/store/cartStore"
import {
  listAddresses,
  createAddress,
  type SavedAddress,
  type CreateAddressInput,
} from "@/src/lib/api/addresses"
import { placeCodOrder } from "@/src/lib/api/orders"
import { AddressPickerSheet } from "@/src/components/checkout/AddressPickerSheet"
import { CouponRow } from "@/src/components/cart/CouponRow"
import { useAuthToken } from "@/src/hooks/useAuthToken"
import { tokens } from "@/src/theme/tokens"

const colors = {
  background: tokens.colors.bg,
  surface: tokens.colors.surface,
  text: tokens.colors.text,
  textMuted: tokens.colors.textMuted,
  border: tokens.colors.border,
  primary: tokens.colors.primary,
  success: tokens.colors.success,
  danger: tokens.colors.danger,
}

export default function CheckoutScreen() {
  const router = useRouter()
  const token = useAuthToken()
  const cart = useCartStore()

  const [addresses, setAddresses] = useState<SavedAddress[]>([])
  const [selected, setSelected] = useState<SavedAddress | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [inlineAddress, setInlineAddress] = useState<CreateAddressInput | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    listAddresses(token)
      .then((list) => {
        setAddresses(list)
        const dflt = list.find((a) => a.is_default) ?? list[0] ?? null
        setSelected(dflt)
      })
      .catch(console.warn)
  }, [token])

  async function handleInlineCreate(data: CreateAddressInput) {
    if (token) {
      const created = await createAddress(token, data)
      setAddresses((prev) => [created, ...prev])
      setSelected(created)
      setInlineAddress(null)
      setPickerOpen(false)
    } else {
      // not logged in — use the inline address one-shot (won't be saved)
      setInlineAddress(data)
      setSelected(null)
      setPickerOpen(false)
    }
  }

  async function place() {
    setError(null)
    if (!cart.shop_slug) {
      setError("Cart is empty")
      return
    }
    if (!selected && !inlineAddress) {
      setError("Please add a delivery address")
      return
    }
    setSubmitting(true)
    try {
      const { order_id } = await placeCodOrder(token, {
        shop_slug: cart.shop_slug,
        address_id: selected?.id,
        inline_address: !selected ? inlineAddress : undefined,
        items: cart.items.map((i) => ({ variant_id: i.variant_id, qty: i.qty })),
        shop_notes: cart.shop_notes,
        delivery_notes: cart.delivery_notes,
        coupon_code: cart.coupon_code,
        currency_code: cart.shop_display_currency,
      })
      cart.clear()
      router.replace({ pathname: "/order/success/[id]", params: { id: order_id } })
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const subtotal = cart.subtotalMinor()
  const discount = cart.discount_minor
  const deliveryFee = 2500
  const total = Math.max(0, subtotal - discount + deliveryFee)

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="dark" />
      <SafeAreaView>
        <View style={[styles.header, { borderColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.back, { backgroundColor: colors.surface }]}
          >
            <Text style={{ fontSize: 20 }}>{"<"}</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text }}>Checkout</Text>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 200 }}>
        {/* Address */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>DELIVER TO</Text>
        <TouchableOpacity
          onPress={() => setPickerOpen(true)}
          style={[styles.card, { borderColor: colors.border }]}
        >
          {selected ? (
            <View>
              <Text style={{ fontWeight: "700", color: colors.text }}>
                {selected.label ?? "Address"}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                {selected.recipient_name ?? ""} · {selected.phone ?? ""}
              </Text>
              <Text style={{ fontSize: 13, marginTop: 4, color: colors.text }}>
                {[selected.region, selected.street, selected.building]
                  .filter(Boolean)
                  .join(", ")}
              </Text>
            </View>
          ) : inlineAddress ? (
            <View>
              <Text style={{ fontWeight: "700", color: colors.text }}>
                {inlineAddress.label ?? "Address"}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                {inlineAddress.recipient_name} · {inlineAddress.phone}
              </Text>
              <Text style={{ fontSize: 13, marginTop: 4, color: colors.text }}>
                {[inlineAddress.region, inlineAddress.street, inlineAddress.building]
                  .filter(Boolean)
                  .join(", ")}
              </Text>
            </View>
          ) : (
            <Text style={{ color: colors.primary, fontWeight: "600" }}>
              + Add delivery address
            </Text>
          )}
        </TouchableOpacity>

        {/* Delivery instructions */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted, marginTop: 22 }]}>
          DELIVERY INSTRUCTIONS
        </Text>
        <TextInput
          multiline
          value={cart.delivery_notes}
          onChangeText={cart.setDeliveryNotes}
          placeholder="Blue gate near pharmacy, call when arrived..."
          placeholderTextColor={colors.textMuted}
          style={[styles.notesInput, { borderColor: colors.border, color: colors.text }]}
        />

        {/* Coupon */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted, marginTop: 22 }]}>
          COUPON
        </Text>
        <CouponRow />

        {/* Payment */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted, marginTop: 22 }]}>
          PAYMENT
        </Text>
        <View style={[styles.paymentCard, { borderColor: colors.border }]}>
          <Text style={{ fontSize: 22 }}>$</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: "700", color: colors.text }}>Cash on Delivery</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>
              Pay the rider on delivery
            </Text>
          </View>
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              backgroundColor: colors.primary,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "white", fontSize: 12, fontWeight: "700" }}>✓</Text>
          </View>
        </View>

        {/* Summary */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted, marginTop: 22 }]}>
          SUMMARY
        </Text>
        <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
          <View style={styles.summaryRow}>
            <Text style={{ color: colors.textMuted }}>
              {cart.items.length} items from {cart.shop_name ?? "the shop"}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={{ color: colors.textMuted }}>Subtotal</Text>
            <Text style={{ color: colors.text }}>
              {formatMinor(subtotal, cart.shop_display_currency)}
            </Text>
          </View>
          {discount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={{ color: colors.success }}>Discount</Text>
              <Text style={{ color: colors.success }}>
                -{formatMinor(discount, cart.shop_display_currency)}
              </Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={{ color: colors.textMuted }}>Delivery fee</Text>
            <Text style={{ color: colors.text }}>
              {formatMinor(deliveryFee, cart.shop_display_currency)}
            </Text>
          </View>
          <View
            style={[
              styles.summaryRow,
              {
                borderTopWidth: 1,
                borderColor: colors.border,
                paddingTop: 10,
                marginTop: 6,
              },
            ]}
          >
            <Text style={{ fontWeight: "700", fontSize: 16, color: colors.text }}>Total</Text>
            <Text style={{ fontWeight: "700", fontSize: 16, color: colors.text }}>
              {formatMinor(total, cart.shop_display_currency)}
            </Text>
          </View>
        </View>

        {error && (
          <Text style={{ color: colors.danger, marginTop: 12 }}>{error}</Text>
        )}
      </ScrollView>

      <SafeAreaView
        style={[styles.cta, { borderColor: colors.border, backgroundColor: colors.background }]}
      >
        <TouchableOpacity
          onPress={place}
          disabled={submitting || (!selected && !inlineAddress)}
          style={[
            styles.placeBtn,
            {
              backgroundColor: colors.primary,
              opacity: submitting || (!selected && !inlineAddress) ? 0.5 : 1,
            },
          ]}
        >
          <Text style={{ color: "white", fontWeight: "700", fontSize: 16 }}>
            {submitting ? "Placing..." : "Place order"}
          </Text>
          {!submitting && (
            <Text style={{ color: "white", fontWeight: "700", fontSize: 16 }}>
              {formatMinor(total, cart.shop_display_currency)} {">"}
            </Text>
          )}
        </TouchableOpacity>
      </SafeAreaView>

      {pickerOpen && (
        <AddressPickerSheet
          addresses={addresses}
          selectedId={selected?.id ?? null}
          onSelect={(addr) => {
            setSelected(addr)
            setInlineAddress(null)
            setPickerOpen(false)
          }}
          onCreate={handleInlineCreate}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </View>
  )
}

function formatMinor(amount: number, currency: "iqd" | "usd"): string {
  if (currency === "iqd") {
    return `${new Intl.NumberFormat("en-IQ").format(amount)} IQD`
  }
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    amount / 100
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
  },
  back: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  card: { borderWidth: 1, borderRadius: 12, padding: 14 },
  notesInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: "top",
  },
  paymentCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderWidth: 1,
    borderRadius: 12,
  },
  summaryCard: { borderRadius: 12, padding: 14 },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  cta: { borderTopWidth: 1, padding: 14, paddingBottom: 28 },
  placeBtn: {
    padding: 14,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
})
