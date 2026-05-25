import React from 'react'
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  Share,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { tokens } from '@/src/theme/tokens'
import { t } from '@/src/i18n'
import { useCartStore } from '@/src/store/cartStore'
import { useAuthStore } from '@/src/store/authStore'
import { showToast } from '@/src/components/Toast'

interface Props {
  visible: boolean
  onClose: () => void
}

const FAKE_GUEST_NAME = 'Sara'

export function InviteToCartSheet({ visible, onClose }: Props) {
  const getInviteLink = useCartStore((s) => s.getInviteLink)
  const addParticipant = useCartStore((s) => s.addParticipant)
  const customer = useAuthStore((s) => s.customer)
  const [link, setLink] = React.useState('')
  const joinTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    if (visible) setLink(getInviteLink())
    return () => {
      if (joinTimer.current) {
        clearTimeout(joinTimer.current)
        joinTimer.current = null
      }
    }
  }, [visible, getInviteLink])

  const customerName = customer?.first_name ?? 'A friend'

  function scheduleFakeJoin() {
    if (joinTimer.current) clearTimeout(joinTimer.current)
    joinTimer.current = setTimeout(() => {
      addParticipant(FAKE_GUEST_NAME)
      showToast({ message: t('cart.invite.joinedToast', { name: FAKE_GUEST_NAME }) })
      joinTimer.current = null
    }, 1200)
  }

  function handleCopy() {
    // Deep-link handler is deferred to Phase D5 — for now the link is
    // "copied" via the OS share sheet (no expo-clipboard dep yet).
    Share.share({ message: link }).catch(() => {})
    showToast({ message: t('cart.invite.copied') })
    scheduleFakeJoin()
  }

  async function handleShare() {
    // Deep-link handler is deferred to Phase D5 — for now this just
    // shares the link via the OS share sheet.
    try {
      await Share.share({
        message: t('cart.invite.shareMessage', { name: customerName }) + '\n' + link,
        ...(Platform.OS === 'ios' ? { url: link } : {}),
      })
    } catch {
      // user cancelled or error — still simulate flow for demo
    }
    scheduleFakeJoin()
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>{t('cart.invite.title')}</Text>
        <Text style={styles.subtitle}>{t('cart.invite.subtitle')}</Text>

        <View style={styles.linkRow}>
          <TextInput
            value={link}
            editable={false}
            selectTextOnFocus
            style={styles.linkInput}
          />
          <Pressable
            onPress={handleCopy}
            style={({ pressed }) => [styles.copyBtn, { opacity: pressed ? 0.85 : 1 }]}
          >
            <Ionicons name="copy-outline" size={16} color={tokens.colors.primaryDark} />
            <Text style={styles.copyText}>{t('cart.invite.copy')}</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={handleShare}
          style={({ pressed }) => [
            styles.shareBtn,
            { opacity: pressed ? 0.9 : 1 },
            pressed && { transform: [{ scale: 0.99 }] },
          ]}
        >
          <Ionicons name="share-social" size={18} color={tokens.colors.white} />
          <Text style={styles.shareBtnText}>{t('cart.invite.share')}</Text>
        </Pressable>

        <Text style={styles.syncNote}>{t('cart.invite.syncSoon')}</Text>
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
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: tokens.colors.border,
    alignSelf: 'center',
    marginBottom: tokens.spacing.md,
  },
  title: {
    fontSize: tokens.fontSize.lg,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text,
    textAlign: 'center',
    marginBottom: tokens.spacing.xs,
  },
  subtitle: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.textMuted,
    textAlign: 'center',
    marginBottom: tokens.spacing.lg,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    marginBottom: tokens.spacing.md,
  },
  linkInput: {
    flex: 1,
    backgroundColor: tokens.colors.surfaceAlt,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.textSubtle,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.accentSoft,
  },
  copyText: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.primaryDark,
  },
  shareBtn: {
    height: 48,
    backgroundColor: tokens.colors.primary,
    borderRadius: tokens.radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.sm,
    marginBottom: tokens.spacing.md,
  },
  shareBtnText: {
    fontSize: tokens.fontSize.md,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.white,
  },
  syncNote: {
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
  },
})
