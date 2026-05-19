import { Modal, View, Text, TouchableOpacity, StyleSheet, Pressable } from "react-native"
import { useRouter } from "expo-router"
import { useCartStore } from "../../store/cartStore"
import { useTheme } from "../../theme/useTheme"

export function CrossShopModal() {
  const { colors } = useTheme()
  const router = useRouter()
  const pending = useCartStore((s) => s.pending_add)
  const currentShopName = useCartStore((s) => s.shop_name)
  const currentShopSlug = useCartStore((s) => s.shop_slug)
  const confirmCrossShopAdd = useCartStore((s) => s.confirmCrossShopAdd)
  const cancelCrossShopAdd = useCartStore((s) => s.cancelCrossShopAdd)

  if (!pending) return null

  return (
    <Modal transparent animationType="fade" visible={true} onRequestClose={cancelCrossShopAdd}>
      <Pressable style={styles.backdrop} onPress={cancelCrossShopAdd}>
        <Pressable style={[styles.modal, { backgroundColor: colors.background }]} onPress={() => {}}>
          <View style={[styles.emoji, { backgroundColor: "#FEF3C7" }]}>
            <Text style={{ fontSize: 28 }}>⚠️</Text>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Start a new basket?</Text>
          <Text style={[styles.body, { color: colors.textMuted }]}>
            Your basket has items from <Text style={{ color: colors.text, fontWeight: "700" }}>{currentShopName ?? "the current shop"}</Text>.{"\n"}
            Adding from <Text style={{ color: colors.text, fontWeight: "700" }}>{pending.shop_name}</Text> will clear those items.
          </Text>
          <View style={styles.actions}>
            <TouchableOpacity onPress={cancelCrossShopAdd} style={[styles.btn, { backgroundColor: colors.surface }]}>
              <Text style={{ color: colors.text, fontWeight: "700" }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={confirmCrossShopAdd} style={[styles.btn, { backgroundColor: colors.primary }]}>
              <Text style={{ color: "white", fontWeight: "700" }}>Clear and add</Text>
            </TouchableOpacity>
          </View>
          {currentShopSlug && (
            <TouchableOpacity
              onPress={() => {
                cancelCrossShopAdd()
                router.push("/(tabs)/cart")
              }}
              style={styles.viewBasketLink}
            >
              <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: "center" }}>
                Want to finish your current order? <Text style={{ color: colors.primary, fontWeight: "600" }}>View basket</Text>
              </Text>
            </TouchableOpacity>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center", padding: 24 },
  modal: { borderRadius: 18, padding: 24, width: "100%", maxWidth: 360 },
  emoji: { width: 56, height: 56, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 14, alignSelf: "center" },
  title: { fontSize: 19, fontWeight: "700", textAlign: "center", marginBottom: 8 },
  body: { fontSize: 14, textAlign: "center", lineHeight: 21, marginBottom: 18 },
  actions: { flexDirection: "row", gap: 10 },
  btn: { flex: 1, padding: 13, borderRadius: 12, alignItems: "center" },
  viewBasketLink: { marginTop: 16, padding: 4 },
})
