import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  SafeAreaView,
  ScrollView,
  Linking,
  Pressable,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useCartStore } from '@/src/store/cartStore';
import { useAuthStore } from '@/src/store/authStore';
import { completeCart } from '@/src/api/cart';
import { listPaymentProviders, initiatePayment, PaymentProvider } from '@/src/api/payments';
import { AppButton } from '@/src/components/AppButton';
import { PriceText } from '@/src/components/PriceText';
import { useTheme } from '@/src/theme/useTheme';

interface AddressForm {
  recipient_name: string;
  phone: string;
  street: string;
  building: string;
  apartment: string;
  city: string;
  postcode: string;
  country_code: string;
  delivery_instructions: string;
}

const EMPTY_ADDRESS: AddressForm = {
  recipient_name: '',
  phone: '',
  street: '',
  building: '',
  apartment: '',
  city: '',
  postcode: '',
  country_code: 'IQ',
  delivery_instructions: '',
};

export default function CheckoutScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const router = useRouter();
  // TODO(SP-B): adapt to new cartStore API — cart/cartId replaced by items/subtotalMinor/shop_slug in Phase 7 checkout wiring
  const items = useCartStore((s) => s.items);
  const subtotalMinor = useCartStore((s) => s.subtotalMinor);
  const shop_display_currency = useCartStore((s) => s.shop_display_currency);
  const clearCart = useCartStore((s) => s.clear);
  // Medusa server-side cart still needed at checkout submit time (Phase 7)
  const cartId: string | null = null; // TODO(SP-B): created server-side at checkout submit (Phase 7)
  const customer = useAuthStore((s) => s.customer);

  const [address, setAddress] = useState<AddressForm>(EMPTY_ADDRESS);
  const [providers, setProviders] = useState<PaymentProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('manual');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listPaymentProviders(shop_display_currency?.toUpperCase() ?? 'IQD')
      .then((p) => {
        setProviders(p);
        if (p.length > 0 && !p.find((x) => x.id === selectedProvider)) {
          setSelectedProvider(p[0].id);
        }
      })
      .catch(() => setProviders([]));
    if (customer) {
      setAddress((a) => ({
        ...a,
        recipient_name: [customer.first_name, customer.last_name].filter(Boolean).join(' '),
      }));
    }
  }, [shop_display_currency, customer]);

  const validAddress =
    address.recipient_name && address.phone && address.street && address.city && address.country_code;

  const onPlace = async () => {
    if (!cartId) return;
    if (!customer) {
      router.push('/auth/login');
      return;
    }
    if (!validAddress) {
      Alert.alert('Address incomplete', 'Please fill recipient name, phone, street, city, and country.');
      return;
    }

    setPlacing(true);
    setError(null);
    try {
      // TODO(SP-B): Phase 7 — create server-side Medusa cart here, then complete it
      // If "manual" → just complete the cart; otherwise initiate the redirect flow.
      if (selectedProvider === 'manual') {
        await completeCart(cartId ?? '');
        await clearCart();
        router.replace('/order-success');
      } else {
        const result = await initiatePayment({
          provider: selectedProvider,
          cart_id: cartId ?? '',
          amount_cents: subtotalMinor(), // TODO(SP-B): Phase 7 — use server-side cart total
          currency: (shop_display_currency ?? 'IQD').toUpperCase(),
          customer_email: customer.email,
          customer_phone: address.phone,
          success_url: 'http://localhost:8081/--/payment-success',
          failure_url: 'http://localhost:8081/--/payment-failure',
        });
        if (result.redirect_url) {
          await Linking.openURL(result.redirect_url);
          // After they pay & return, app should be reopened via deep link → mark order complete.
          // For MVP just show toast.
          Alert.alert('Opened payment page', 'Complete payment in your browser. Order will finalize when you return.');
        } else if (result.client_token) {
          Alert.alert('Stripe Elements needed', 'Use the Stripe client_token in a card form. (TODO)');
        }
      }
    } catch (e: any) {
      setError(e?.response?.data?.error ?? e?.message ?? 'Failed to place order.');
    } finally {
      setPlacing(false);
    }
  };

  const Field = (props: {
    label: string;
    value: string;
    onChangeText: (v: string) => void;
    required?: boolean;
    keyboardType?: any;
    multiline?: boolean;
  }) => (
    <View style={{ gap: 4 }}>
      <Text style={[typography.caption, { color: colors.textMuted }]}>
        {props.label}
        {props.required ? ' *' : ''}
      </Text>
      <TextInput
        value={props.value}
        onChangeText={props.onChangeText}
        keyboardType={props.keyboardType}
        multiline={props.multiline}
        style={{
          backgroundColor: colors.surface,
          color: colors.text,
          padding: spacing.md,
          borderRadius: radius.md,
          minHeight: props.multiline ? 60 : undefined,
          textAlignVertical: props.multiline ? 'top' : 'center',
        }}
      />
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl }}>
        <Text style={[typography.title, { color: colors.text }]}>Checkout</Text>

        {/* Order summary */}
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm }}>
          <Text style={[typography.heading, { color: colors.text }]}>Order summary</Text>
          {items.map((item) => (
            <View key={item.variant_id} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={[typography.body, { color: colors.text, flex: 1 }]}>
                {item.title} × {item.qty}
              </Text>
              <PriceText amount={item.unit_price_minor * item.qty} currencyCode={item.currency_code} />
            </View>
          ))}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm }}>
            <Text style={[typography.heading, { color: colors.text }]}>Total</Text>
            <PriceText amount={subtotalMinor()} currencyCode={shop_display_currency} />
          </View>
        </View>

        {/* Shipping address */}
        <View style={{ gap: spacing.sm }}>
          <Text style={[typography.heading, { color: colors.text }]}>Delivery address</Text>
          <Field label="Recipient name" value={address.recipient_name} onChangeText={(v) => setAddress({ ...address, recipient_name: v })} required />
          <Field label="Phone" value={address.phone} onChangeText={(v) => setAddress({ ...address, phone: v })} required keyboardType="phone-pad" />
          <Field label="Street" value={address.street} onChangeText={(v) => setAddress({ ...address, street: v })} required />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Field label="Building" value={address.building} onChangeText={(v) => setAddress({ ...address, building: v })} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Apartment" value={address.apartment} onChangeText={(v) => setAddress({ ...address, apartment: v })} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 2 }}>
              <Field label="City" value={address.city} onChangeText={(v) => setAddress({ ...address, city: v })} required />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Postcode" value={address.postcode} onChangeText={(v) => setAddress({ ...address, postcode: v })} />
            </View>
          </View>
          <Field label="Delivery instructions" value={address.delivery_instructions} onChangeText={(v) => setAddress({ ...address, delivery_instructions: v })} multiline />
        </View>

        {/* Payment method */}
        <View style={{ gap: spacing.sm }}>
          <Text style={[typography.heading, { color: colors.text }]}>Payment method</Text>
          {providers.length === 0 ? (
            <Text style={[typography.caption, { color: colors.textMuted }]}>Loading payment options…</Text>
          ) : (
            providers.map((p) => {
              const selected = selectedProvider === p.id;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => setSelectedProvider(p.id)}
                  style={({ pressed }) => ({
                    backgroundColor: colors.surface,
                    borderRadius: radius.md,
                    padding: spacing.md,
                    borderWidth: 2,
                    borderColor: selected ? colors.primary : colors.border,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.md,
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      borderWidth: 2,
                      borderColor: selected ? colors.primary : colors.border,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {selected && (
                      <View
                        style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary }}
                      />
                    )}
                  </View>
                  <Text style={[typography.body, { color: colors.text, fontWeight: '600', flex: 1 }]}>{p.label}</Text>
                </Pressable>
              );
            })
          )}
        </View>

        {error ? (
          <View style={{ backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md }}>
            <Text style={{ color: colors.danger }}>{error}</Text>
          </View>
        ) : null}

        <AppButton
          title={
            selectedProvider === 'manual'
              ? 'Place order — pay on delivery'
              : `Pay with ${providers.find((p) => p.id === selectedProvider)?.label ?? selectedProvider}`
          }
          onPress={onPlace}
          loading={placing}
          disabled={!validAddress}
        />
        <Text style={[typography.caption, { color: colors.textMuted, textAlign: 'center' }]}>
          By placing this order you agree to our terms.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
