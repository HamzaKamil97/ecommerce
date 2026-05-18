import React, { useEffect } from 'react';
import Animated, { useSharedValue, withTiming, useAnimatedStyle, withDelay } from 'react-native-reanimated';

interface Props {
  delay?: number;
  duration?: number;
  translateY?: number;
  children: React.ReactNode;
  style?: any;
}

/**
 * Fade + translate the children in on mount. Use for staggered list reveal,
 * page enter, or hero text.
 */
export function FadeIn({ delay = 0, duration = 400, translateY = 12, children, style }: Props) {
  const opacity = useSharedValue(0);
  const ty = useSharedValue(translateY);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration }));
    ty.value = withDelay(delay, withTiming(0, { duration }));
  }, [delay, duration, opacity, ty]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: ty.value }],
  }));

  return <Animated.View style={[animatedStyle, style]}>{children}</Animated.View>;
}
