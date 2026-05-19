import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native"
import { useRouter } from "expo-router"
import { useCartStore, CartItem } from "../../store/cartStore"
import { useTheme } from "../../theme/useTheme"

interface Props { item: CartItem }

export function CartItemRow({ item }: Props) {
  const { colors } = useTheme()
  const router = useRouter()
  const incQty = useCartStore((s) => s.incQty)
  const decQty = useCartStore((s) => s.decQty)
  const removeItem = useCartStore((s) => s.removeItem)
  const lineTotal = item.qty * item.unit_price_minor

  return (
    <View style={[styles.row, { borderColor: colors.border }]}>
      <TouchableOpacity onPress={() => router.push(`/products/${item.product_handle}`)}>
        {item.thumbnail ? (
          <Image source={{ uri: item.thumbnail }} style={styles.img} />
        ) : (
          <View style={[styles.img, { backgroundColor: colors.surface }]} />
        )}
      </TouchableOpacity>
      <View style={styles.body}>
        <TouchableOpacity onPress={() => router.push(`/products/${item.product_handle}`)}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>{item.title}</Text>
        </TouchableOpacity>
        <Text style={[styles.unit, { color: colors.textMuted }]}>{formatMinor(item.unit_price_minor, item.currency_code)}</Text>
        <View style={styles.actions}>
          <View style={[styles.stepper, { backgroundColor: colors.surface }]}>
            <TouchableOpacity onPress={() => decQty(item.variant_id)} style={[styles.stepBtn, { borderColor: colors.border, backgroundColor: "white" }]}>
              <Text style={[styles.stepBtnText, { color: colors.textMuted }]}>−</Text>
            </TouchableOpacity>
            <Text style={[styles.qty, { color: colors.text }]}>{item.qty}</Text>
            <TouchableOpacity onPress={() => incQty(item.variant_id)} style={[styles.stepBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}>
              <Text style={[styles.stepBtnText, { color: "white" }]}>+</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.lineTotal, { color: colors.text }]}>{formatMinor(lineTotal, item.currency_code)}</Text>
          <TouchableOpacity onPress={() => removeItem(item.variant_id)}>
            <Text style={[styles.trash, { color: colors.textMuted }]}>🗑</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

function formatMinor(amount: number, currency: "iqd" | "usd"): string {
  if (currency === "iqd") return `${new Intl.NumberFormat("en-IQ").format(amount)} IQD`
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount / 100)
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 12, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  img: { width: 72, height: 72, borderRadius: 10 },
  body: { flex: 1, minWidth: 0 },
  title: { fontSize: 15, fontWeight: "600", marginBottom: 4 },
  unit: { fontSize: 13, marginBottom: 10 },
  actions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  stepper: { flexDirection: "row", alignItems: "center", borderRadius: 999, padding: 4, gap: 4 },
  stepBtn: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  stepBtnText: { fontSize: 16, fontWeight: "700" },
  qty: { minWidth: 28, textAlign: "center", fontWeight: "700", fontSize: 14 },
  lineTotal: { fontWeight: "700", fontSize: 15 },
  trash: { fontSize: 18, padding: 4 },
})
