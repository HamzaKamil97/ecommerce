import React from 'react'
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { tokens } from '@/src/theme/tokens'
import { t } from '@/src/i18n'
import { showToast } from '@/src/components/Toast'
import type { VisionResponse } from '@/src/lib/najma/vision'

interface Props {
  result: VisionResponse
  onSnapAgain: () => void
  onDone: () => void
}

function ConfidenceDot({ level }: { level?: 'high' | 'medium' | 'low' }) {
  const color =
    level === 'high'
      ? tokens.colors.success
      : level === 'medium'
        ? tokens.colors.warning
        : level === 'low'
          ? tokens.colors.danger
          : tokens.colors.borderSubtle
  return <View style={[styles.dot, { backgroundColor: color }]} />
}

export function CameraResultSheet({ result, onSnapAgain, onDone }: Props) {
  const items = result.items ?? []
  const basket = result.suggestedBasket ?? []

  const handleAddBasketItem = () => {
    showToast({ message: t('najma.vision.addedSoon') })
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Najma summary */}
        <View style={styles.summaryRow}>
          <View style={styles.avatar}>
            <Ionicons name="star" size={20} color={tokens.colors.white} />
          </View>
          <Text style={styles.summaryText}>
            {result.summary || t('najma.vision.error')}
          </Text>
        </View>

        {/* Items the model saw */}
        {items.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('najma.vision.result.iSee')}</Text>
            <View style={styles.list}>
              {items.map((it, i) => (
                <View key={`see-${i}`} style={styles.itemRow}>
                  <ConfidenceDot level={it.confidence} />
                  <Text style={styles.itemName}>{it.name}</Text>
                  {!!it.qty && <Text style={styles.itemQty}>{it.qty}</Text>}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Suggested basket */}
        {basket.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('najma.vision.result.iSuggest')}</Text>
            <View style={styles.list}>
              {basket.map((b, i) => (
                <View key={`b-${i}`} style={styles.basketCard}>
                  <View style={styles.basketBody}>
                    <Text style={styles.basketName}>{b.name}</Text>
                    <Text style={styles.basketReason}>{b.reason}</Text>
                  </View>
                  <Pressable
                    onPress={handleAddBasketItem}
                    style={({ pressed }) => [
                      styles.addBtn,
                      pressed && styles.addBtnPressed,
                    ]}
                    hitSlop={6}
                  >
                    <Ionicons name="add" size={18} color={tokens.colors.white} />
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={onSnapAgain}
          style={({ pressed }) => [styles.btn, styles.btnGhost, pressed && styles.btnPressed]}
        >
          <Ionicons name="camera" size={16} color={tokens.colors.text} />
          <Text style={styles.btnGhostText}>{t('najma.vision.result.snapAgain')}</Text>
        </Pressable>
        <Pressable
          onPress={onDone}
          style={({ pressed }) => [styles.btn, styles.btnPrimary, pressed && styles.btnPressed]}
        >
          <Text style={styles.btnPrimaryText}>{t('najma.vision.result.done')}</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.bg,
  },
  scroll: {
    padding: tokens.spacing.lg,
    paddingBottom: tokens.spacing.xl,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: tokens.spacing.md,
    alignItems: 'flex-start',
    marginBottom: tokens.spacing.lg,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: tokens.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryText: {
    flex: 1,
    fontSize: tokens.fontSize.md,
    color: tokens.colors.text,
    lineHeight: 22,
  },
  section: {
    marginBottom: tokens.spacing.lg,
  },
  sectionTitle: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.extrabold,
    color: tokens.colors.textSubtle,
    marginBottom: tokens.spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  list: {
    gap: tokens.spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    backgroundColor: tokens.colors.surface,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  itemName: {
    flex: 1,
    fontSize: tokens.fontSize.base,
    color: tokens.colors.text,
    fontWeight: tokens.fontWeight.semibold,
  },
  itemQty: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.textMuted,
  },
  basketCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.md,
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.borderSubtle,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.md,
  },
  basketBody: {
    flex: 1,
    gap: 2,
  },
  basketName: {
    fontSize: tokens.fontSize.base,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text,
  },
  basketReason: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.textMuted,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: tokens.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnPressed: {
    backgroundColor: tokens.colors.primaryDark,
  },
  footer: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.md,
    paddingBottom: tokens.spacing.xl,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.borderSubtle,
    backgroundColor: tokens.colors.bg,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    gap: tokens.spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: tokens.spacing.md,
    borderRadius: tokens.radius.lg,
  },
  btnGhost: {
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  btnGhostText: {
    fontSize: tokens.fontSize.base,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text,
  },
  btnPrimary: {
    backgroundColor: tokens.colors.primary,
  },
  btnPrimaryText: {
    fontSize: tokens.fontSize.base,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.white,
  },
  btnPressed: {
    opacity: 0.85,
  },
})
