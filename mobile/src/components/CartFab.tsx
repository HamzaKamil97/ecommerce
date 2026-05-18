import { TouchableOpacity, View, Text, StyleSheet } from "react-native"
import { useTheme } from "../theme/useTheme"

interface Props {
  itemCount: number
  onPress: () => void
}

/**
 * Small circle floating action button. Bottom-right. Shows item count in a
 * saffron badge. Hidden when itemCount === 0. InstaShop / Talabat pattern.
 */
export function CartFab({ itemCount, onPress }: Props) {
  const { colors } = useTheme()
  if (itemCount <= 0) return null
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.wrap}>
      <View style={[styles.fab, { backgroundColor: colors.primary }]}>
        <Text style={styles.icon}>🛒</Text>
        <View style={[styles.badge, { backgroundColor: colors.accent }]}>
          <Text style={[styles.badgeText, { color: colors.text }]}>{itemCount}</Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", bottom: 24, right: 24, zIndex: 100 },
  fab: {
    width: 56, height: 56, borderRadius: 28,
    justifyContent: "center", alignItems: "center",
    shadowColor: "#000", shadowOpacity: 0.25, shadowOffset: { width: 0, height: 6 }, shadowRadius: 12, elevation: 8,
  },
  icon: { fontSize: 22 },
  badge: {
    position: "absolute", top: -4, right: -4,
    minWidth: 22, height: 22, borderRadius: 11,
    paddingHorizontal: 6,
    justifyContent: "center", alignItems: "center",
    borderWidth: 2, borderColor: "white",
  },
  badgeText: { fontSize: 11, fontWeight: "800" },
})
