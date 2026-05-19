import { Modal, View, Text, TouchableOpacity, StyleSheet, Pressable } from "react-native"
import { useRouter } from "expo-router"
import { useCartStore } from "../../store/cartStore"
import { tokens } from "../../theme/tokens"

export function CrossShopModal() {
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
        <Pressable style={styles.modal} onPress={() => {}}>
          <View style={styles.emoji}>
            <Text style={{ fontSize: 28 }}>⚠️</Text>
          </View>
          <Text style={styles.title}>Start a new basket?</Text>
          <Text style={styles.body}>
            Your basket has items from <Text style={styles.bodyStrong}>{currentShopName ?? "the current shop"}</Text>.{"\n"}
            Adding from <Text style={styles.bodyStrong}>{pending.shop_name}</Text> will clear those items.
          </Text>
          <View style={styles.actions}>
            <TouchableOpacity onPress={cancelCrossShopAdd} style={[styles.btn, styles.btnCancel]}>
              <Text style={styles.btnCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={confirmCrossShopAdd} style={[styles.btn, styles.btnConfirm]}>
              <Text style={styles.btnConfirmText}>Clear and add</Text>
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
              <Text style={styles.viewBasketText}>
                Want to finish your current order? <Text style={styles.viewBasketLinkText}>View basket</Text>
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
  modal: {
    borderRadius: 18,
    padding: 24,
    width: "100%",
    maxWidth: 360,
    backgroundColor: tokens.colors.bg,
  },
  emoji: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    alignSelf: "center",
    backgroundColor: "#FEF3C7",
  },
  title: {
    fontSize: 19,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
    color: tokens.colors.text,
  },
  body: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 18,
    color: tokens.colors.textMuted,
  },
  bodyStrong: { color: tokens.colors.text, fontWeight: "700" },
  actions: { flexDirection: "row", gap: 10 },
  btn: { flex: 1, padding: 13, borderRadius: 12, alignItems: "center" },
  btnCancel: { backgroundColor: tokens.colors.surface },
  btnCancelText: { color: tokens.colors.text, fontWeight: "700" },
  btnConfirm: { backgroundColor: tokens.colors.primary },
  btnConfirmText: { color: tokens.colors.white, fontWeight: "700" },
  viewBasketLink: { marginTop: 16, padding: 4 },
  viewBasketText: { color: tokens.colors.textMuted, fontSize: 12, textAlign: "center" },
  viewBasketLinkText: { color: tokens.colors.primary, fontWeight: "600" },
})
