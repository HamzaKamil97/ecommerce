import { View, ViewStyle } from 'react-native';
import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { useTheme } from '../theme/useTheme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 6, style }: SkeletonProps) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.6, duration: 700, easing: Easing.ease, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 700, easing: Easing.ease, useNativeDriver: true }),
      ])
    ).start();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { width: width as any, height, borderRadius, backgroundColor: colors.border, opacity },
        style,
      ]}
    />
  );
}

export function ProductCardSkeleton() {
  const { colors, spacing, radius } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        margin: 6,
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.md,
      }}
    >
      <Skeleton height={140} borderRadius={radius.md} />
      <View style={{ height: spacing.sm }} />
      <Skeleton width="80%" height={14} />
      <View style={{ height: spacing.xs }} />
      <Skeleton width="40%" height={16} />
    </View>
  );
}
