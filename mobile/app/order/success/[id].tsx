import { useEffect, useRef } from "react"
import { View, Text, TouchableOpacity, Animated, Easing, StyleSheet, SafeAreaView } from "react-native"
import { StatusBar } from "expo-status-bar"
import { useLocalSearchParams, useRouter } from "expo-router"
import { tokens } from "@/src/theme/tokens"
import { t } from "@/src/i18n"
import { useLanguageStore } from "@/src/store/languageStore"
import { DEMO_ORDERS, findDemoOrder } from "@/src/data/demoOrders"

const colors = {
  background: tokens.colors.bg,
  surface: tokens.colors.surface,
  text: tokens.colors.text,
  textMuted: tokens.colors.textMuted,
  primary: tokens.colors.primary,
}

export default function OrderSuccessScreen() {
  useLanguageStore((s) => s.locale)
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const scale = useRef(new Animated.Value(0.3)).current
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scale, { toValue: 1, duration: 600, easing: Easing.bezier(0.34, 1.56, 0.64, 1), useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start()
  }, [])

  const matched = findDemoOrder(id) ?? DEMO_ORDERS[0]
  const displayId = (matched?.displayId ?? id?.slice(-6) ?? "------").toUpperCase()
  const shopName = matched?.shopName ?? "—"
  const eta = matched?.eta ?? "25–35 min"
  const total = matched?.total ?? "—"
  const targetId = matched?.id ?? id

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="dark" />
      <View style={{ flex: 1, padding: 24, alignItems: "center" }}>
        <Animated.View style={[
          styles.check,
          { backgroundColor: "#ECFDF5", borderColor: colors.primary, opacity, transform: [{ scale }] },
        ]}>
          <Text style={{ fontSize: 60, color: colors.primary }}>✓</Text>
        </Animated.View>

        <Text style={[styles.title, { color: colors.text }]}>{t('checkout.success.title')}</Text>
        <Text style={{ fontSize: 14, color: colors.textMuted, marginBottom: 24 }}>
          Order <Text style={[styles.orderCode, { backgroundColor: colors.surface, color: colors.text }]}>#{displayId}</Text>
        </Text>

        <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
          <InfoRow icon="🏪" label="Shop" value={shopName} colors={colors} />
          <InfoRow icon="⏱️" label={t('orders.arrivingIn', { eta: '' }).replace('{eta}', '').trim() || 'Arriving in'} value={eta} colors={colors} bold />
          <InfoRow icon="💵" label={t('orders.cashOnDelivery')} value={total} colors={colors} bold />
        </View>

        <Text style={{ fontSize: 12, color: colors.textMuted, textAlign: "center", marginTop: 12, lineHeight: 18 }}>
          We'll text you when the order updates.
        </Text>

        <View style={{ flex: 1 }} />

        <View style={{ width: "100%", gap: 10, paddingBottom: 12 }}>
          <TouchableOpacity
            onPress={() => router.push(`/orders/${targetId}` as never)}
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={{ color: "white", fontWeight: "700", fontSize: 16 }}>📍 Track order</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.replace("/(tabs)/shops")} style={styles.secondaryBtn}>
            <Text style={{ color: colors.primary, fontWeight: "600" }}>{`← ${t('checkout.success.back')}`}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  )
}

function InfoRow({ icon, label, value, colors, bold }: { icon: string; label: string; value: string; colors: any; bold?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <View style={[styles.infoIcon, { backgroundColor: "white" }]}>
        <Text style={{ fontSize: 16 }}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 12, color: colors.textMuted }}>{label}</Text>
        <Text style={[{ fontSize: 14, color: colors.text }, bold ? { fontWeight: "700" } : { fontWeight: "500" }]}>{value}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  check: {
    width: 110, height: 110, borderRadius: 55,
    borderWidth: 4,
    alignItems: "center", justifyContent: "center",
    marginTop: 40, marginBottom: 24,
  },
  title: { fontSize: 26, fontWeight: "700", marginBottom: 10 },
  orderCode: { fontFamily: "Menlo", fontWeight: "700", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  infoCard: { width: "100%", borderRadius: 14, padding: 16 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 6 },
  infoIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  primaryBtn: { padding: 14, borderRadius: 12, alignItems: "center" },
  secondaryBtn: { padding: 12, alignItems: "center" },
})
