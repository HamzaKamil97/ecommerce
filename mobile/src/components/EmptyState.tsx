import { Pressable, View, Text } from 'react-native';
import { tokens } from '../theme/tokens';

interface EmptyStateProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, subtitle, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: tokens.spacing.xl,
      }}
    >
      <Text style={{ fontSize: tokens.fontSize.lg, fontWeight: tokens.fontWeight.semibold, color: tokens.colors.text, marginBottom: tokens.spacing.sm }}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={{ fontSize: tokens.fontSize.base, color: tokens.colors.textMuted, textAlign: 'center' }}>
          {subtitle}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => ({
            marginTop: tokens.spacing.lg,
            paddingHorizontal: tokens.spacing.xl,
            paddingVertical: tokens.spacing.sm,
            borderRadius: tokens.radius.pill,
            borderWidth: 1,
            borderColor: tokens.colors.primary,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text style={{ color: tokens.colors.primary, fontWeight: tokens.fontWeight.semibold, fontSize: tokens.fontSize.base }}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
