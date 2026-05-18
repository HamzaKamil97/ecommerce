import { Pressable, View, Text, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Shop, emojiForVertical } from '../api/shops';
import { useTheme } from '../theme/useTheme';

interface ShopCardProps {
  shop: Shop;
}

export function ShopCard({ shop }: ShopCardProps) {
  const router = useRouter();
  const { colors, spacing, radius, typography } = useTheme();
  const logo = shop.branding?.logo_url;
  const primary = shop.branding?.primary_color ?? colors.primary;

  return (
    <Pressable
      onPress={() => router.push(`/shops/${shop.slug}`)}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          padding: spacing.md,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View
        style={{
          width: '100%',
          aspectRatio: 1.6,
          borderRadius: radius.md,
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
        style={[typography.body, { color: colors.text, marginTop: spacing.sm, fontWeight: '600' }]}
      >
        {shop.name}
      </Text>
      <Text style={[typography.caption, { color: colors.textMuted, textTransform: 'capitalize' }]}>
        {shop.vertical}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { width: 200, marginRight: 12 },
});
