import { Pressable, Text } from 'react-native';
import { useTheme } from '../theme/useTheme';

interface CategoryChipProps {
  label: string;
  emoji?: string;
  selected?: boolean;
  onPress: () => void;
}

export function CategoryChip({ label, emoji, selected, onPress }: CategoryChipProps) {
  const { colors, spacing, radius, typography } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.pill,
        backgroundColor: selected ? colors.primary : colors.surface,
        marginRight: spacing.sm,
        opacity: pressed ? 0.7 : 1,
        borderWidth: 1,
        borderColor: selected ? colors.primary : colors.border,
      })}
    >
      <Text
        style={{
          ...typography.body,
          color: selected ? colors.primaryText : colors.text,
          fontWeight: '600',
        }}
      >
        {emoji ? `${emoji} ` : ''}
        {label}
      </Text>
    </Pressable>
  );
}
