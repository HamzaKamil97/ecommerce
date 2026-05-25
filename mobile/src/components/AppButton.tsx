import { Pressable, Text, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';
import { tokens } from '../theme/tokens';

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
  const isPrimary = variant === 'primary';
  const bg = isPrimary ? tokens.colors.primary : tokens.colors.surface;
  const fg = isPrimary ? tokens.colors.white : tokens.colors.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: bg,
          borderRadius: tokens.radius.lg,
          height: isPrimary ? 52 : 44,
          paddingHorizontal: tokens.spacing.lg,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          borderWidth: isPrimary ? 0 : 1,
          borderColor: tokens.colors.border,
        },
        pressed && !disabled ? { transform: [{ scale: 0.98 }] } : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={{ fontSize: tokens.fontSize.md, fontFamily: tokens.fontFamily.bold, fontWeight: tokens.fontWeight.bold, color: fg }}>{title}</Text>
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
