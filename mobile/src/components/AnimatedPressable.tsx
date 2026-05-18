import React from 'react';
import { Pressable, PressableProps } from 'react-native';
import Animated, { useSharedValue, withSpring, useAnimatedStyle } from 'react-native-reanimated';

const AnimatedPressableRN = Animated.createAnimatedComponent(Pressable);

interface Props extends PressableProps {
  scaleTo?: number;
  children: React.ReactNode;
}

/**
 * A Pressable that springs down to scaleTo on press, then back to 1 on release.
 * Use anywhere you want a delightful tactile feel.
 */
export function AnimatedPressable({ scaleTo = 0.95, children, style, ...rest }: Props) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressableRN
      {...rest}
      onPressIn={(e) => {
        scale.value = withSpring(scaleTo, { damping: 14, stiffness: 220 });
        rest.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, { damping: 14, stiffness: 220 });
        rest.onPressOut?.(e);
      }}
      style={[animatedStyle, style as any]}
    >
      {children}
    </AnimatedPressableRN>
  );
}
