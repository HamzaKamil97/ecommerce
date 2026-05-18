import { View, Text } from 'react-native';
import { useTheme } from '../theme/useTheme';

interface EmptyStateProps {
  title: string;
  subtitle?: string;
}

export function EmptyState({ title, subtitle }: EmptyStateProps) {
  const { colors, spacing, typography } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl,
      }}
    >
      <Text style={[typography.heading, { color: colors.text, marginBottom: spacing.sm }]}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={[typography.body, { color: colors.textMuted, textAlign: 'center' }]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
