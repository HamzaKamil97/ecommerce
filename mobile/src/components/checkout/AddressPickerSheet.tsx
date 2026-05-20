import { useState } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
  StyleSheet,
} from "react-native"
import { AddressForm } from "./AddressForm"
import { tokens } from "../../theme/tokens"
import type { SavedAddress, CreateAddressInput } from "../../lib/api/addresses"

interface Props {
  addresses: SavedAddress[]
  selectedId: string | null
  onSelect: (a: SavedAddress) => void
  onCreate: (data: CreateAddressInput) => Promise<void>
  onClose: () => void
}

export function AddressPickerSheet({
  addresses,
  selectedId,
  onSelect,
  onCreate,
  onClose,
}: Props) {
  const [adding, setAdding] = useState(addresses.length === 0)
  const [submitting, setSubmitting] = useState(false)

  async function handleCreate(data: CreateAddressInput) {
    setSubmitting(true)
    try {
      await onCreate(data)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal transparent animationType="slide" visible={true} onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: tokens.colors.bg }]} onPress={() => {}}>
          <View style={[styles.handleBar, { backgroundColor: tokens.colors.border }]} />
          <View style={styles.header}>
            <Text style={[styles.title, { color: tokens.colors.text }]}>
              {adding ? "Add address" : "Choose delivery address"}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ fontSize: 22, color: tokens.colors.textMuted }}>x</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
            {adding ? (
              <AddressForm onSubmit={handleCreate} submitting={submitting} />
            ) : (
              <>
                {addresses.map((a) => {
                  const isSelected = a.id === selectedId
                  return (
                    <TouchableOpacity
                      key={a.id}
                      onPress={() => onSelect(a)}
                      style={[
                        styles.row,
                        {
                          borderColor: isSelected ? tokens.colors.primary : tokens.colors.border,
                          backgroundColor: isSelected ? "#ECFDF5" : "transparent",
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.radio,
                          { borderColor: isSelected ? tokens.colors.primary : tokens.colors.border },
                        ]}
                      >
                        {isSelected && (
                          <View
                            style={[styles.radioDot, { backgroundColor: tokens.colors.primary }]}
                          />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <View
                          style={{
                            flexDirection: "row",
                            gap: 6,
                            alignItems: "center",
                            marginBottom: 2,
                          }}
                        >
                          <Text style={[styles.addrLabel, { color: tokens.colors.text }]}>
                            {a.label ?? "Address"}
                          </Text>
                          {a.is_default && (
                            <View
                              style={[styles.defaultPill, { backgroundColor: tokens.colors.accent }]}
                            >
                              <Text style={{ fontSize: 10, fontWeight: "700", color: tokens.colors.text }}>
                                DEFAULT
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.recipient, { color: tokens.colors.textMuted }]}>
                          {a.recipient_name} · {a.phone}
                        </Text>
                        <Text style={[styles.full, { color: tokens.colors.text }]}>
                          {[a.region, a.street, a.building].filter(Boolean).join(", ")}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )
                })}
                <TouchableOpacity
                  onPress={() => setAdding(true)}
                  style={[styles.addNew, { borderColor: tokens.colors.border }]}
                >
                  <View style={[styles.plusCircle, { backgroundColor: tokens.colors.primary }]}>
                    <Text style={{ color: tokens.colors.white, fontWeight: "700" }}>+</Text>
                  </View>
                  <Text style={{ color: tokens.colors.primary, fontWeight: "600" }}>
                    Add new address
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    maxHeight: "85%",
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 14,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  title: { fontSize: 16, fontWeight: "700" },
  row: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 10,
    alignItems: "flex-start",
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  addrLabel: { fontSize: 14, fontWeight: "700" },
  defaultPill: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  recipient: { fontSize: 12, marginVertical: 2 },
  full: { fontSize: 13 },
  addNew: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 12,
    marginTop: 6,
  },
  plusCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
})
