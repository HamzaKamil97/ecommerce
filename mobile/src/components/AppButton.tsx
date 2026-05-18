import { Pressable, Text, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme/useTheme';

interface AppButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  style?: ViewStyle;
}

export function AppButton({
  title,
  onPress,
  loading,
  disabled,
  variant = 'primary',
  style,
}: AppButtonProps) {
  const { colors, radius, spacing, typography } = useTheme();
  const isPrimary = variant === 'primary';
  const bg = isPrimary ? colors.primary : colors.surface;
  const fg = isPrimary ? colors.primaryText : colors.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: bg,
          borderRadius: radius.md,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          opacity: pressed || disabled ? 0.7 : 1,
          borderWidth: isPrimary ? 0 : 1,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={[typography.button, { color: fg }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
