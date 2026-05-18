import { View, Text, StyleSheet } from "react-native"
import { useTheme } from "../theme/useTheme"
import type { LeafSchema, FieldDef } from "../lib/api/types"

interface Props {
  schema: LeafSchema
  coreFields: Record<string, unknown>
  customFields: Record<string, unknown>
}

/**
 * Renders schema-driven core_fields as a label:value list, then any
 * custom_fields below in a separate "Extras" panel. Header says "Details"
 * regardless of section — same component for food, fashion, electronics, etc.
 *
 * Fields whose schema hint contains "not shown on product" are filtered out
 * (used for prep_min — needed by backend ETA, not customer-visible).
 */
export function DetailsPanel({ schema, coreFields, customFields }: Props) {
  const { colors } = useTheme()
  const visibleFields = schema.core_fields.filter(
    (f) => coreFields[f.key] !== undefined && coreFields[f.key] !== null && !isHiddenFromCustomer(f)
  )
  const customEntries = Object.entries(customFields ?? {})

  return (
    <View>
      {visibleFields.length > 0 && (
        <View style={[styles.panel, { borderColor: colors.border }]}>
          <View style={[styles.header, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.headerText, { color: colors.textMuted }]}>Details</Text>
          </View>
          {visibleFields.map((f) => (
            <View key={f.key} style={[styles.row, { borderColor: colors.border }]}>
              <Text style={[styles.key, { color: colors.textMuted }]}>{f.label}</Text>
              <Text style={[styles.val, { color: colors.text }]}>{formatValue(f, coreFields[f.key])}</Text>
            </View>
          ))}
        </View>
      )}

      {customEntries.length > 0 && (
        <View style={[styles.extras, { backgroundColor: colors.surface }]}>
          <Text style={[styles.extrasHeader, { color: colors.textMuted }]}>Extras</Text>
          {customEntries.map(([k, v]) => (
            <View key={k} style={styles.extraRow}>
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>{k}</Text>
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: "500" }}>{String(v)}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

function isHiddenFromCustomer(f: FieldDef): boolean {
  return (f.hint ?? "").toLowerCase().includes("not shown on product")
}

function formatValue(f: FieldDef, v: unknown): string {
  if (f.type === "boolean") return v ? "Yes" : "No"
  if (f.type === "string[]" && Array.isArray(v)) return v.join(", ")
  return String(v)
}

const styles = StyleSheet.create({
  panel: { borderWidth: 1, borderRadius: 12, marginTop: 12, overflow: "hidden" },
  header: { padding: 10, borderBottomWidth: 1 },
  headerText: { fontSize: 12, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },
  row: { flexDirection: "row", paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  key: { flex: 1, fontSize: 14 },
  val: { flex: 1.4, fontSize: 14, fontWeight: "500", textAlign: "right" },
  extras: { borderRadius: 12, padding: 12, marginTop: 12 },
  extrasHeader: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 6 },
  extraRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
})
