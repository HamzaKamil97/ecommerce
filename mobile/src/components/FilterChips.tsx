import { ScrollView, TouchableOpacity, Text, StyleSheet } from "react-native"
import { useTheme } from "../theme/useTheme"

export interface ChipDef {
  id: string
  label: string
  active: boolean
  hasCaret?: boolean
  prefix?: string // e.g., "⚡"
}

interface Props {
  chips: ChipDef[]
  onPress: (id: string) => void
}

export function FilterChips({ chips, onPress }: Props) {
  const { colors } = useTheme()
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      keyboardShouldPersistTaps="handled"
    >
      {chips.map((c) => (
        <TouchableOpacity
          key={c.id}
          onPress={() => onPress(c.id)}
          style={[
            styles.chip,
            { backgroundColor: c.active ? colors.primary : colors.surface },
          ]}
        >
          <Text
            numberOfLines={1}
            style={[styles.label, { color: c.active ? "white" : colors.textMuted }]}
          >
            {c.prefix ? `${c.prefix} ` : ""}{c.label}{c.hasCaret ? " ▾" : ""}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 16, paddingVertical: 12, gap: 8, alignItems: "center" },
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    flexShrink: 0,
  },
  label: { fontSize: 13, fontWeight: "600" },
})
