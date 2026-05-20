import { useEffect, useState } from 'react';
import { FlatList, SafeAreaView, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { tokens } from '@/src/theme/tokens';
import { useAuthStore } from '@/src/store/authStore';
import { listProductReviews, submitProductReview, ProductReview, ReviewStats } from '@/src/api/reviews';
import { AppButton } from '@/src/components/AppButton';
import { EmptyState } from '@/src/components/EmptyState';
import { StarRating } from '@/src/components/StarRating';

export default function ProductReviewsScreen() {
  const { productId } = useLocalSearchParams<{ productId: string }>();
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
    <SafeAreaView style={{ flex: 1, backgroundColor: tokens.colors.bg }}>
      <FlatList
        data={reviews}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ padding: tokens.spacing.lg, gap: tokens.spacing.md }}
        ListHeaderComponent={
          <View style={{ gap: tokens.spacing.lg }}>
            {/* Stats header */}
            <View
              style={{
                backgroundColor: tokens.colors.surface,
                padding: tokens.spacing.lg,
                borderRadius: tokens.radius.lg,
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Text style={{ fontSize: 48, fontWeight: '700', color: tokens.colors.text }}>{stats.average.toFixed(1)}</Text>
              <StarRating value={Math.round(stats.average)} size={20} />
              <Text style={{ fontSize: tokens.fontSize.xs, color: tokens.colors.textMuted }}>
                {stats.count} {stats.count === 1 ? 'review' : 'reviews'}
              </Text>
            </View>

            {/* Distribution bars */}
            <View style={{ gap: 4 }}>
              {[5, 4, 3, 2, 1].map((n) => {
                const count = stats.distribution[n] ?? 0;
                const pct = stats.count > 0 ? (count / stats.count) * 100 : 0;
                return (
                  <View key={n} style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm }}>
                    <Text style={{ fontSize: tokens.fontSize.xs, color: tokens.colors.textMuted, width: 16 }}>{n}</Text>
                    <View style={{ flex: 1, height: 8, backgroundColor: tokens.colors.surface, borderRadius: 4, overflow: 'hidden' }}>
                      <View style={{ width: `${pct}%`, height: '100%', backgroundColor: '#F5C518' }} />
                    </View>
                    <Text style={{ fontSize: tokens.fontSize.xs, color: tokens.colors.textMuted, width: 30, textAlign: 'right' }}>
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
                  backgroundColor: tokens.colors.surface,
                  borderRadius: tokens.radius.lg,
                  padding: tokens.spacing.lg,
                  gap: tokens.spacing.md,
                }}
              >
                <Text style={{ fontSize: tokens.fontSize.lg, fontWeight: tokens.fontWeight.semibold, color: tokens.colors.text }}>Leave a review</Text>
                <StarRating value={rating} size={28} editable onChange={setRating} />
                <TextInput
                  placeholder="Title (optional)"
                  placeholderTextColor={tokens.colors.textMuted}
                  value={title}
                  onChangeText={setTitle}
                  style={{ backgroundColor: tokens.colors.bg, color: tokens.colors.text, padding: tokens.spacing.md, borderRadius: tokens.radius.md }}
                />
                <TextInput
                  placeholder="Tell others about your experience…"
                  placeholderTextColor={tokens.colors.textMuted}
                  value={body}
                  onChangeText={setBody}
                  multiline
                  numberOfLines={4}
                  style={{
                    backgroundColor: tokens.colors.bg,
                    color: tokens.colors.text,
                    padding: tokens.spacing.md,
                    borderRadius: tokens.radius.md,
                    minHeight: 80,
                    textAlignVertical: 'top',
                  }}
                />
                <AppButton title="Submit review" onPress={onSubmit} loading={submitting} disabled={!rating} />
              </View>
            )}

            <Text style={{ fontSize: tokens.fontSize.lg, fontWeight: tokens.fontWeight.semibold, color: tokens.colors.text }}>All reviews</Text>
          </View>
        }
        ListEmptyComponent={<EmptyState title="No reviews yet" subtitle="Be the first to share your experience." />}
        renderItem={({ item }) => (
          <View style={{ backgroundColor: tokens.colors.surface, borderRadius: tokens.radius.md, padding: tokens.spacing.md, gap: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <StarRating value={item.rating} size={14} />
              <Text style={{ fontSize: tokens.fontSize.xs, color: tokens.colors.textMuted }}>
                {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </View>
            {item.title && (
              <Text style={{ fontSize: tokens.fontSize.base, color: tokens.colors.text, fontWeight: '600' }}>{item.title}</Text>
            )}
            {item.body && <Text style={{ fontSize: tokens.fontSize.base, color: tokens.colors.textMuted }}>{item.body}</Text>}
            {item.is_verified_purchase && (
              <Text style={{ fontSize: tokens.fontSize.xs, color: tokens.colors.success, marginTop: 2 }}>✓ Verified purchase</Text>
            )}
            {item.vendor_reply && (
              <View
                style={{
                  marginTop: tokens.spacing.sm,
                  paddingLeft: tokens.spacing.md,
                  borderLeftWidth: 2,
                  borderLeftColor: tokens.colors.primary,
                }}
              >
                <Text style={{ fontSize: tokens.fontSize.xs, color: tokens.colors.textMuted, fontWeight: '600' }}>Shop reply:</Text>
                <Text style={{ fontSize: tokens.fontSize.base, color: tokens.colors.text }}>{item.vendor_reply}</Text>
              </View>
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
}
