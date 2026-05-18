import { useEffect, useState } from 'react';
import { FlatList, SafeAreaView, ScrollView, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/src/theme/useTheme';
import { useAuthStore } from '@/src/store/authStore';
import { listProductReviews, submitProductReview, ProductReview, ReviewStats } from '@/src/api/reviews';
import { AppButton } from '@/src/components/AppButton';
import { EmptyState } from '@/src/components/EmptyState';
import { StarRating } from '@/src/components/StarRating';

export default function ProductReviewsScreen() {
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const { colors, spacing, radius, typography } = useTheme();
  const customer = useAuthStore((s) => s.customer);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [stats, setStats] = useState<ReviewStats>({ average: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    if (!productId) return;
    const r = await listProductReviews(productId).catch(() => ({
      reviews: [],
      stats: { average: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
    }));
    setReviews(r.reviews);
    setStats(r.stats);
  };

  useEffect(() => {
    load();
  }, [productId]);

  const onSubmit = async () => {
    if (!customer || !rating || !productId) return;
    setSubmitting(true);
    try {
      await submitProductReview(productId, { customerId: customer.id, rating, title, body });
      setRating(0);
      setTitle('');
      setBody('');
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={reviews}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
        ListHeaderComponent={
          <View style={{ gap: spacing.lg }}>
            {/* Stats header */}
            <View
              style={{
                backgroundColor: colors.surface,
                padding: spacing.lg,
                borderRadius: radius.lg,
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Text style={{ fontSize: 48, fontWeight: '700', color: colors.text }}>{stats.average.toFixed(1)}</Text>
              <StarRating value={Math.round(stats.average)} size={20} />
              <Text style={[typography.caption, { color: colors.textMuted }]}>
                {stats.count} {stats.count === 1 ? 'review' : 'reviews'}
              </Text>
            </View>

            {/* Distribution bars */}
            <View style={{ gap: 4 }}>
              {[5, 4, 3, 2, 1].map((n) => {
                const count = stats.distribution[n] ?? 0;
                const pct = stats.count > 0 ? (count / stats.count) * 100 : 0;
                return (
                  <View key={n} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <Text style={[typography.caption, { color: colors.textMuted, width: 16 }]}>{n}</Text>
                    <View style={{ flex: 1, height: 8, backgroundColor: colors.surface, borderRadius: 4, overflow: 'hidden' }}>
                      <View style={{ width: `${pct}%`, height: '100%', backgroundColor: '#F5C518' }} />
                    </View>
                    <Text style={[typography.caption, { color: colors.textMuted, width: 30, textAlign: 'right' }]}>
                      {count}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Compose */}
            {customer && (
              <View
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: radius.lg,
                  padding: spacing.lg,
                  gap: spacing.md,
                }}
              >
                <Text style={[typography.heading, { color: colors.text }]}>Leave a review</Text>
                <StarRating value={rating} size={28} editable onChange={setRating} />
                <TextInput
                  placeholder="Title (optional)"
                  placeholderTextColor={colors.textMuted}
                  value={title}
                  onChangeText={setTitle}
                  style={{ backgroundColor: colors.background, color: colors.text, padding: spacing.md, borderRadius: radius.md }}
                />
                <TextInput
                  placeholder="Tell others about your experience…"
                  placeholderTextColor={colors.textMuted}
                  value={body}
                  onChangeText={setBody}
                  multiline
                  numberOfLines={4}
                  style={{
                    backgroundColor: colors.background,
                    color: colors.text,
                    padding: spacing.md,
                    borderRadius: radius.md,
                    minHeight: 80,
                    textAlignVertical: 'top',
                  }}
                />
                <AppButton title="Submit review" onPress={onSubmit} loading={submitting} disabled={!rating} />
              </View>
            )}

            <Text style={[typography.heading, { color: colors.text }]}>All reviews</Text>
          </View>
        }
        ListEmptyComponent={<EmptyState title="No reviews yet" subtitle="Be the first to share your experience." />}
        renderItem={({ item }) => (
          <View style={{ backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, gap: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <StarRating value={item.rating} size={14} />
              <Text style={[typography.caption, { color: colors.textMuted }]}>
                {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </View>
            {item.title && (
              <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>{item.title}</Text>
            )}
            {item.body && <Text style={[typography.body, { color: colors.textMuted }]}>{item.body}</Text>}
            {item.is_verified_purchase && (
              <Text style={[typography.caption, { color: colors.success, marginTop: 2 }]}>✓ Verified purchase</Text>
            )}
            {item.vendor_reply && (
              <View
                style={{
                  marginTop: spacing.sm,
                  paddingLeft: spacing.md,
                  borderLeftWidth: 2,
                  borderLeftColor: colors.primary,
                }}
              >
                <Text style={[typography.caption, { color: colors.textMuted, fontWeight: '600' }]}>Shop reply:</Text>
                <Text style={[typography.body, { color: colors.text }]}>{item.vendor_reply}</Text>
              </View>
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
}
