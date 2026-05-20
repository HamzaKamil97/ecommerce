import React from 'react'
import { View, Text, ScrollView, Pressable, SafeAreaView, StyleSheet, TextInput } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useCartStore } from '@/src/store/cartStore'
import { tokens } from '@/src/theme/tokens'
import { StoreSection } from '@/src/components/cart/StoreSection'
import { CartSummary } from '@/src/components/cart/CartSummary'
import { StickyCheckoutBar } from '@/src/components/cart/StickyCheckoutBar'
import { t } from '@/src/i18n'
import { useLanguageStore } from '@/src/store/languageStore'
import { useChromeStore } from '@/src/store/chromeStore'

const DELIVERY_FEE = 2500

export default function CartScreen() {
  React.useEffect(() => {
    useChromeStore.getState().setButlerFabHidden(true)
    return () => useChromeStore.getState().setButlerFabHidden(false)
  }, [])

  const router = useRouter()
  useLanguageStore((s) => s.locale)
  const items = useCartStore((s) => s.items)
  const shop_name = useCartStore((s) => s.shop_name)
  const shop_slug = useCartStore((s) => s.shop_slug)
  const subtotal = useCartStore((s) => s.subtotalMinor())
  const currency = useCartStore((s) => s.shop_display_currency)
  const clearCart = useCartStore((s) => s.clear)
  const shopNotes = useCartStore((s) => s.shop_notes)
  const deliveryNotes = useCartStore((s) => s.delivery_notes)
  const setShopNotes = useCartStore((s) => s.setShopNotes)
  const setDeliveryNotes = useCartStore((s) => s.setDeliveryNotes)
  const [localShopNotes, setLocalShopNotes] = React.useState(shopNotes)
  const [localDeliveryNotes, setLocalDeliveryNotes] = React.useState(deliveryNotes)
  React.useEffect(() => { setLocalShopNotes(shopNotes) }, [shopNotes])
  React.useEffect(() => { setLocalDeliveryNotes(deliveryNotes) }, [deliveryNotes])

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.emptyRoot}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('cart.myBasket')}</Text>
        </View>
        <View style={styles.emptyBody}>
          <Ionicons name="cart-outline" size={64} color={tokens.colors.textSubtle} style={styles.emptyIcon} />
          <Text style={styles.emptyTitle}>{t('cart.basketEmpty')}</Text>
          <Text style={styles.emptySubtitle}>{t('cart.addItemsFromShop')}</Text>
          <Pressable
            onPress={() => router.push('/(tabs)/' as any)}
            style={({ pressed }) => [styles.browseBtn, { opacity: pressed ? 0.85 : 1 }]}
          >
            <Text style={styles.browseBtnText}>{t('cart.browseShops')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  const total = subtotal + DELIVERY_FEE

  // Current cart store is single-shop — group as one section
  const storeGroups = shop_name && shop_slug
    ? [{ shopName: shop_name, shopSlug: shop_slug, items }]
    : [{ shopName: 'Your basket', shopSlug: '', items }]

  const deliveries = storeGroups.map((g) => ({
    shopName: g.shopName,
    fee: DELIVERY_FEE,
    currency,
  }))

  return (
    <View style={styles.root}>
      <SafeAreaView style={{ backgroundColor: tokens.colors.bg }}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <Text style={styles.backBtnText}>‹</Text>
          </Pressable>
          <Text style={styles.headerTitle}>{t('cart.myBasket')}</Text>
          <View style={{ width: 36 }} />
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {storeGroups.map((group) => (
          <StoreSection
            key={group.shopSlug || 'default'}
            shopName={group.shopName}
            shopSlug={group.shopSlug}
            deliveryInfo="Estimated 25–35 min"
            items={group.items}
            onClearStore={clearCart}
          />
        ))}

        <View style={styles.notesCard}>
          <Text style={styles.notesLabel}>{t('cart.shopNotesLabel')}</Text>
          <TextInput
            value={localShopNotes}
            onChangeText={setLocalShopNotes}
            onBlur={() => setShopNotes(localShopNotes)}
            placeholder={t('cart.shopNotesPlaceholder')}
            placeholderTextColor={tokens.colors.textSubtle}
            multiline
            maxLength={200}
            style={styles.notesInput}
          />
        </View>

        <CartSummary
          subtotal={subtotal}
          currency={currency}
          deliveries={deliveries}
        />

        <View style={styles.notesCard}>
          <Text style={styles.notesLabel}>{t('cart.deliveryNotesLabel')}</Text>
          <TextInput
            value={localDeliveryNotes}
            onChangeText={setLocalDeliveryNotes}
            onBlur={() => setDeliveryNotes(localDeliveryNotes)}
            placeholder={t('cart.deliveryNotesPlaceholder')}
            placeholderTextColor={tokens.colors.textSubtle}
            multiline
            maxLength={200}
            style={styles.notesInput}
          />
        </View>
      </ScrollView>

      <StickyCheckoutBar
        total={total}
        currency={currency}
        onCheckout={() => router.push('/checkout')}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: tokens.colors.bg,
  },
  emptyRoot: {
    flex: 1,
    backgroundColor: tokens.colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: tokens.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: tokens.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    fontSize: 22,
    color: tokens.colors.text,
    lineHeight: 28,
    marginLeft: -2,
  },
  headerTitle: {
    fontSize: tokens.fontSize.lg,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text,
  },
  scrollContent: {
    paddingTop: tokens.spacing.lg,
    paddingBottom: tokens.spacing.xxxl,
  },
  emptyBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacing.xl,
    gap: tokens.spacing.sm,
  },
  emptyIcon: {
    marginBottom: tokens.spacing.sm,
  },
  notesCard: {
    marginHorizontal: tokens.spacing.lg,
    marginBottom: tokens.spacing.md,
    padding: tokens.spacing.md,
    backgroundColor: tokens.colors.bg,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  notesLabel: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.text,
    marginBottom: tokens.spacing.xs,
  },
  notesInput: {
    fontSize: tokens.fontSize.base,
    color: tokens.colors.text,
    minHeight: 56,
    textAlignVertical: 'top',
    paddingVertical: tokens.spacing.xs,
  },
  emptyTitle: {
    fontSize: tokens.fontSize.lg,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text,
  },
  emptySubtitle: {
    fontSize: tokens.fontSize.base,
    color: tokens.colors.textMuted,
    textAlign: 'center',
  },
  browseBtn: {
    marginTop: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.xl,
    backgroundColor: tokens.colors.primary,
    borderRadius: tokens.radius.pill,
  },
  browseBtnText: {
    fontSize: tokens.fontSize.base,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.white,
  },
})
