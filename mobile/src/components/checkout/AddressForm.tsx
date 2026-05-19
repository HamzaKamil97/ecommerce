import { useState } from "react"
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from "react-native"
import { useTheme } from "../../theme/useTheme"
import type { CreateAddressInput } from "../../lib/api/addresses"

interface Props {
  initial?: Partial<CreateAddressInput>
  onSubmit: (data: CreateAddressInput, save: boolean) => Promise<void> | void
  submitting?: boolean
}

const CITIES = ["Baghdad", "Erbil", "Basra", "Mosul", "Najaf", "Karbala", "Sulaymaniyah", "Kirkuk"]

export function AddressForm({ initial, onSubmit, submitting }: Props) {
  const { colors } = useTheme()
  const [label, setLabel] = useState(initial?.label ?? "Home")
  const [recipientName, setRecipientName] = useState(initial?.recipient_name ?? "")
  const [phone, setPhone] = useState(initial?.phone ?? "")
  const [city, setCity] = useState(initial?.city ?? "Baghdad")
  const [region, setRegion] = useState(initial?.region ?? "")
  const [street, setStreet] = useState(initial?.street ?? "")
  const [building, setBuilding] = useState(initial?.building ?? "")
  const [apartment, setApartment] = useState(initial?.apartment ?? "")
  const [deliveryInstructions, setDeliveryInstructions] = useState(
    initial?.delivery_instructions ?? ""
  )
  const [save, setSave] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (!recipientName || !phone || !street || !city) {
      setError("Recipient, phone, street, and city are required")
      return
    }
    setError(null)
    try {
      await onSubmit(
        {
          label,
          recipient_name: recipientName,
          phone,
          city,
          region: region || null,
          street,
          building: building || null,
          apartment: apartment || null,
          country_code: "IQ",
          delivery_instructions: deliveryInstructions || null,
          is_default: save,
        },
        save
      )
    } catch (e: any) {
      setError(e.message)
    }
  }

  return (
    <ScrollView style={{ width: "100%" }} contentContainerStyle={styles.form}>
      <Field label="Label" value={label ?? ""} onChange={setLabel} placeholder="Home" colors={colors} />
      <Field
        label="Recipient name *"
        value={recipientName}
        onChange={setRecipientName}
        placeholder="Full name"
        colors={colors}
      />
      <Field
        label="Phone *"
        value={phone}
        onChange={setPhone}
        placeholder="+964 750 xxx xxxx"
        keyboardType="phone-pad"
        colors={colors}
      />

      <View style={styles.chipSection}>
        <Text style={[styles.label, { color: colors.textMuted }]}>City *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          {CITIES.map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => setCity(c)}
              style={[
                styles.chip,
                { backgroundColor: city === c ? colors.primary : colors.surface },
              ]}
            >
              <Text
                style={{ color: city === c ? "white" : colors.text, fontSize: 13, fontWeight: "600" }}
              >
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <Field
        label="Area / Region"
        value={region}
        onChange={setRegion}
        placeholder="Karrada, Mansour, etc."
        colors={colors}
      />
      <Field
        label="Street / Building *"
        value={street}
        onChange={setStreet}
        placeholder="Street name, building number"
        colors={colors}
      />
      <View style={styles.row}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Field label="Building" value={building} onChange={setBuilding} placeholder="optional" colors={colors} />
        </View>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Field
            label="Apartment / Floor"
            value={apartment}
            onChange={setApartment}
            placeholder="optional"
            colors={colors}
          />
        </View>
      </View>
      <Field
        label="Delivery instructions"
        value={deliveryInstructions}
        onChange={setDeliveryInstructions}
        placeholder="Blue gate near pharmacy, call when arrived, etc."
        colors={colors}
      />

      <TouchableOpacity
        onPress={() => setSave(!save)}
        style={[styles.toggleRow, { backgroundColor: colors.surface }]}
      >
        <View
          style={[
            styles.checkbox,
            {
              borderColor: colors.primary,
              backgroundColor: save ? colors.primary : "transparent",
            },
          ]}
        >
          {save && (
            <Text style={{ color: "white", fontSize: 13, fontWeight: "700" }}>✓</Text>
          )}
        </View>
        <Text style={{ color: colors.text, fontSize: 13 }}>Save for next time</Text>
      </TouchableOpacity>

      {error && (
        <Text style={{ color: colors.danger, marginTop: 8, fontSize: 13 }}>{error}</Text>
      )}

      <TouchableOpacity
        onPress={submit}
        disabled={submitting}
        style={[
          styles.saveBtn,
          { backgroundColor: colors.primary, opacity: submitting ? 0.5 : 1 },
        ]}
      >
        <Text style={{ color: "white", fontWeight: "700", fontSize: 15 }}>
          {submitting ? "Saving..." : "Use this address"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  keyboardType,
  colors,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  keyboardType?: any
  colors: any
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      <TextInput
        style={[styles.input, { borderColor: colors.border, color: colors.text }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  form: { paddingBottom: 24 },
  field: { marginBottom: 12 },
  label: { fontSize: 12, fontWeight: "600", marginBottom: 4 },
  input: { padding: 10, borderWidth: 1, borderRadius: 10, fontSize: 14 },
  row: { flexDirection: "row", alignItems: "flex-start" },
  chipSection: { flex: 1 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, marginRight: 8 },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtn: { marginTop: 8, padding: 12, borderRadius: 12, alignItems: "center" },
})
