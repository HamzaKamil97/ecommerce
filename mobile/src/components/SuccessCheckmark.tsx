import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  withSpring,
  withTiming,
  withSequence,
  useAnimatedStyle,
  withDelay,
} from 'react-native-reanimated';
import { tokens } from '../theme/tokens';

interface Props {
  size?: number;
  color?: string;
}

/**
 * Animated success checkmark — circle scales in, check strokes draw.
 * Use on order-success screen, payment success, etc.
 */
export function SuccessCheckmark({ size = 96, color }: Props) {
  const tick = color ?? tokens.colors.success;
  const circleScale = useSharedValue(0);
  const checkScale = useSharedValue(0);
  const haloScale = useSharedValue(0);
  const haloOpacity = useSharedValue(0.6);

  useEffect(() => {
    circleScale.value = withSpring(1, { damping: 10, stiffness: 120 });
    checkScale.value = withDelay(250, withSpring(1, { damping: 8, stiffness: 180 }));
    haloScale.value = withSequence(
      withTiming(0, { duration: 0 }),
      withDelay(150, withTiming(2.2, { duration: 700 })),
    );
    haloOpacity.value = withSequence(
      withTiming(0.6, { duration: 0 }),
      withDelay(150, withTiming(0, { duration: 700 })),
    );
  }, [circleScale, checkScale, haloScale, haloOpacity]);

  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: circleScale.value }],
  }));
  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));
  const haloStyle = useAnimatedStyle(() => ({
    transform: [{ scale: haloScale.value }],
    opacity: haloOpacity.value,
  }));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: tick,
          },
          haloStyle,
        ]}
      />
      <Animated.View
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: tick,
            alignItems: 'center',
            justifyContent: 'center',
          },
          circleStyle,
        ]}
      >
        <Animated.Text style={[{ color: '#fff', fontSize: size * 0.5, fontWeight: '700' }, checkStyle]}>
          ✓
        </Animated.Text>
      </Animated.View>
    </View>
  );
}
