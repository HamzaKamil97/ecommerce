import { Pressable, View, Text, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Shop, emojiForVertical } from '../api/shops';
import { tokens } from '../theme/tokens';

interface ShopCardProps {
  shop: Shop;
}

export function ShopCard({ shop }: ShopCardProps) {
  const router = useRouter();
  const logo = shop.branding?.logo_url;
  const primary = shop.branding?.primary_color ?? tokens.colors.primary;

  return (
    <Pressable
      onPress={() => router.push(`/shops/${shop.slug}`)}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: tokens.colors.surface,
          borderRadius: tokens.radius.lg,
          padding: tokens.spacing.md,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View
        style={{
          width: '100%',
          aspectRatio: 1.6,
          borderRadius: tokens.radius.md,
          backgroundColor: primary,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {logo ? (
          <Image source={{ uri: logo }} style={{ width: 60, height: 60, borderRadius: 30 }} />
        ) : (
          <Text style={{ fontSize: 44 }}>{emojiForVertical(shop.vertical)}</Text>
        )}
      </View>
      <Text
        numberOfLines={1}
        style={{ fontSize: tokens.fontSize.base, color: tokens.colors.text, marginTop: tokens.spacing.sm, fontWeight: '600' }}
      >
        {shop.name}
      </Text>
      <Text style={{ fontSize: tokens.fontSize.xs, color: tokens.colors.textMuted, textTransform: 'capitalize' }}>
        {shop.vertical}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { width: 200, marginRight: 12 },
});
