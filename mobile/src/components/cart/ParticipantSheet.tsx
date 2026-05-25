import React from 'react'
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { tokens } from '@/src/theme/tokens'
import { t } from '@/src/i18n'
import { useCartStore, type CartParticipant } from '@/src/store/cartStore'

interface Props {
  visible: boolean
  participant: CartParticipant | null
  onClose: () => void
}

export function ParticipantSheet({ visible, participant, onClose }: Props) {
  const removeParticipant = useCartStore((s) => s.removeParticipant)

  if (!participant) return null

  const initial = (participant.name?.[0] ?? '?').toUpperCase()
  const role = participant.isOwner
    ? t('cart.participant.owner')
    : t('cart.participant.guest')

  function handleRemove() {
    removeParticipant(participant!.id)
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />

        <View style={[styles.avatar, { backgroundColor: participant.avatarColor }]}>
          <Text style={styles.avatarLetter}>{initial}</Text>
        </View>

        <Text style={styles.name}>{participant.name}</Text>
        <Text style={styles.role}>{role}</Text>

        {!participant.isOwner && (
          <Pressable
            onPress={handleRemove}
            style={({ pressed }) => [styles.removeBtn, { opacity: pressed ? 0.85 : 1 }]}
          >
            <Ionicons name="person-remove-outline" size={16} color={tokens.colors.danger} />
            <Text style={styles.removeText}>{t('cart.participant.remove')}</Text>
          </Pressable>
        )}

        <Pressable onPress={onClose} style={styles.dismissBtn}>
          <Text style={styles.dismissText}>{t('common.close')}</Text>
        </Pressable>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: tokens.colors.bg,
    borderTopLeftRadius: tokens.radius.lg,
    borderTopRightRadius: tokens.radius.lg,
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.sm,
    paddingBottom: 36,
    alignItems: 'center',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: tokens.colors.border,
    marginBottom: tokens.spacing.lg,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.spacing.md,
  },
  avatarLetter: {
    fontSize: 32,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.white,
  },
  name: {
    fontSize: tokens.fontSize.lg,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text,
  },
  role: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.textMuted,
    marginTop: tokens.spacing.xs,
    marginBottom: tokens.spacing.lg,
  },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.colors.danger,
    marginBottom: tokens.spacing.md,
  },
  removeText: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.danger,
  },
  dismissBtn: {
    paddingVertical: tokens.spacing.sm,
  },
  dismissText: {
    fontSize: tokens.fontSize.base,
    color: tokens.colors.textMuted,
  },
})
