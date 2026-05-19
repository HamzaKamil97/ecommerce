import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native"
import { useRouter } from "expo-router"
import { useCartStore } from "@/src/store/cartStore"
import { CartItemRow } from "@/src/components/cart/CartItemRow"
import { useTheme } from "@/src/theme/useTheme"

export default function CartScreen() {
  const router = useRouter()
  const { colors } = useTheme()
  const items = useCartStore((s) => s.items)
  const shop_name = useCartStore((s) => s.shop_name)
  const shop_slug = useCartStore((s) => s.shop_slug)
  const subtotal = useCartStore((s) => s.subtotalMinor())
  const currency = useCartStore((s) => s.shop_display_currency)
  const shop_notes = useCartStore((s) => s.shop_notes)
  const setShopNotes = useCartStore((s) => s.setShopNotes)

  if (items.length === 0) {
    return (
      <SafeAreaView style={[styles.empty, { backgroundColor: colors.background }]}>
        <Text style={{ fontSize: 56, marginBottom: 12 }}>🛒</Text>
        <Text style={{ fontSize: 18, fontWeight: "600", color: colors.text, marginBottom: 16 }}>Your basket is empty</Text>
        <TouchableOpacity onPress={() => router.push("/(tabs)/shops")} style={[styles.browseBtn, { backgroundColor: colors.primary }]}>
          <Text style={{ color: "white", fontWeight: "700" }}>Browse shops</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  const deliveryFee = 2500
  const total = subtotal + deliveryFee

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={{ backgroundColor: colors.background }}>
        <View style={[styles.header, { borderColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.back, { backgroundColor: colors.surface }]}>
            <Text style={{ fontSize: 20 }}>‹</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]}>Your basket</Text>
            {shop_name && <Text style={[styles.sub, { color: colors.textMuted }]}>{shop_name}</Text>}
          </View>
          {shop_slug && (
            <TouchableOpacity onPress={() => router.push(`/shops/${shop_slug}`)}>
              <Text style={{ color: colors.primary, fontWeight: "600" }}>+ Add more</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.items}>
        {items.map((item) => <CartItemRow key={item.variant_id} item={item} />)}

        <View style={{ marginTop: 20 }}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Notes for the shop (optional)</Text>
          <TextInput
            multiline
            placeholder="No onions, cut in 8 slices, allergies, etc."
            placeholderTextColor={colors.textMuted}
            value={shop_notes}
            onChangeText={setShopNotes}
            style={[styles.notes, { borderColor: colors.border, color: colors.text }]}
          />
        </View>
      </ScrollView>

      <SafeAreaView style={[styles.summary, { borderColor: colors.border, backgroundColor: colors.background }]}>
        <View style={styles.summaryRow}>
          <Text style={{ color: colors.textMuted, fontSize: 14 }}>Subtotal</Text>
          <Text style={{ color: colors.text, fontSize: 14 }}>{formatMinor(subtotal, currency)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={{ color: colors.textMuted, fontSize: 14 }}>Delivery fee</Text>
          <Text style={{ color: colors.text, fontSize: 14 }}>{formatMinor(deliveryFee, currency)}</Text>
        </View>
        <View style={[styles.summaryRow, { borderTopWidth: 1, borderColor: colors.border, paddingTop: 10, marginTop: 6 }]}>
          <Text style={{ color: colors.text, fontWeight: "700", fontSize: 17 }}>Total</Text>
          <Text style={{ color: colors.text, fontWeight: "700", fontSize: 17 }}>{formatMinor(total, currency)}</Text>
        </View>
        <TouchableOpacity onPress={() => router.push("/checkout")} style={[styles.checkoutBtn, { backgroundColor: colors.primary }]}>
          <Text style={styles.checkoutText}>Checkout</Text>
          <Text style={styles.checkoutText}>{formatMinor(total, currency)} →</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  )
}

function formatMinor(amount: number, currency: "iqd" | "usd"): string {
  if (currency === "iqd") return `${new Intl.NumberFormat("en-IQ").format(amount)} IQD`
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount / 100)
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  browseBtn: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderBottomWidth: 1 },
  back: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 16, fontWeight: "700" },
  sub: { fontSize: 12 },
  items: { paddingHorizontal: 16, paddingBottom: 220 },
  sectionLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  notes: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 14, minHeight: 80, textAlignVertical: "top" },
  summary: { borderTopWidth: 1, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  checkoutBtn: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 14, padding: 14, borderRadius: 12 },
  checkoutText: { color: "white", fontWeight: "700", fontSize: 16 },
})
