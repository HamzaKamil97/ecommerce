import { useState } from "react"
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator } from "react-native"
import { useCartStore } from "../../store/cartStore"
import { tokens } from "../../theme/tokens"

const BASE = process.env.EXPO_PUBLIC_MEDUSA_BACKEND_URL ?? "http://localhost:9000"
const PK = process.env.EXPO_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ""

export function CouponRow() {
  const [expanded, setExpanded] = useState(false)
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const setCoupon = useCartStore((s) => s.setCoupon)
  const couponCode = useCartStore((s) => s.coupon_code)
  const subtotal = useCartStore((s) => s.subtotalMinor())
  const currency = useCartStore((s) => s.shop_display_currency)

  async function apply() {
    setBusy(true)
    setErr(null)
    try {
      const r = await fetch(`${BASE}/store/promotions/validate`, {
        method: "POST",
        headers: {
          "x-publishable-api-key": PK,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          code,
          subtotal_cents: subtotal,
          currency: currency.toUpperCase(),
        }),
      })
      const data = await r.json()
      if (!data.ok) {
        setErr(data.error ?? "Code invalid")
        return
      }
      setCoupon(code, data.discount_cents ?? 0)
      setExpanded(false)
      setCode("")
    } catch (e: any) {
      setErr(e.message ?? "Network error")
    } finally {
      setBusy(false)
    }
  }

  if (couponCode) {
    return (
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          padding: 12,
          backgroundColor: "#ECFDF5",
          borderRadius: 10,
        }}
      >
        <Text style={{ color: tokens.colors.primary, fontWeight: "700" }}>✓ {couponCode}</Text>
        <TouchableOpacity onPress={() => setCoupon(null, 0)}>
          <Text style={{ color: tokens.colors.textMuted }}>Remove</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (!expanded) {
    return (
      <TouchableOpacity onPress={() => setExpanded(true)} style={{ padding: 12 }}>
        <Text style={{ color: tokens.colors.primary, fontWeight: "600" }}>
          Have a coupon code? &rsaquo;
        </Text>
      </TouchableOpacity>
    )
  }

  return (
    <View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <TextInput
          value={code}
          onChangeText={setCode}
          placeholder="Coupon code"
          autoCapitalize="characters"
          placeholderTextColor={tokens.colors.textMuted}
          style={{
            flex: 1,
            padding: 10,
            borderWidth: 1,
            borderColor: tokens.colors.border,
            borderRadius: 10,
            color: tokens.colors.text,
          }}
        />
        <TouchableOpacity
          onPress={apply}
          disabled={busy || !code}
          style={{
            paddingHorizontal: 16,
            justifyContent: "center",
            backgroundColor: tokens.colors.primary,
            borderRadius: 10,
            opacity: !code || busy ? 0.5 : 1,
          }}
        >
          {busy ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={{ color: "white", fontWeight: "700" }}>Apply</Text>
          )}
        </TouchableOpacity>
      </View>
      {err && (
        <Text style={{ color: tokens.colors.danger, marginTop: 6, fontSize: 12 }}>{err}</Text>
      )}
    </View>
  )
}
