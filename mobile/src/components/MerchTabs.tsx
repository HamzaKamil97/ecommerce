import { ScrollView, TouchableOpacity, Text, View, StyleSheet } from "react-native"
import { useTheme } from "../theme/useTheme"
import type { MerchCategory } from "../lib/api/types"

interface Props {
  categories: MerchCategory[]
  activeHandle: string | null
  onSelect: (handle: string) => void
}

export function MerchTabs({ categories, activeHandle, onSelect }: Props) {
  const { colors } = useTheme()
  return (
    <View style={[styles.wrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {categories.map((c) => {
          const active = c.handle === activeHandle
          return (
            <TouchableOpacity
              key={c.handle}
              onPress={() => onSelect(c.handle)}
              style={[
                styles.tab,
                { backgroundColor: active ? colors.text : colors.surface },
              ]}
            >
              <Text style={[
                styles.label,
                { color: active ? "white" : colors.textMuted },
              ]}>
                {c.name}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { borderBottomWidth: StyleSheet.hairlineWidth },
  row: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  tab: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, marginRight: 8 },
  label: { fontSize: 13, fontWeight: "600" },
})
