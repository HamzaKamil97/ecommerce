import { View, Text } from 'react-native';
import { tokens } from '../theme/tokens';

interface EmptyStateProps {
  title: string;
  subtitle?: string;
}

export function EmptyState({ title, subtitle }: EmptyStateProps) {
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
    </View>
  );
}
