import { Pressable, Text } from 'react-native';
import { tokens } from '../theme/tokens';

interface CategoryChipProps {
  label: string;
  emoji?: string;
  selected?: boolean;
  onPress: () => void;
}

export function CategoryChip({ label, emoji, selected, onPress }: CategoryChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: tokens.spacing.md,
        paddingVertical: tokens.spacing.sm,
        borderRadius: tokens.radius.pill,
        backgroundColor: selected ? tokens.colors.primary : tokens.colors.surface,
        marginRight: tokens.spacing.sm,
        opacity: pressed ? 0.7 : 1,
        borderWidth: 1,
        borderColor: selected ? tokens.colors.primary : tokens.colors.border,
      })}
    >
      <Text
        style={{
          fontSize: tokens.fontSize.base,
          color: selected ? tokens.colors.white : tokens.colors.text,
          fontWeight: '600',
        }}
      >
        {emoji ? `${emoji} ` : ''}
        {label}
      </Text>
    </Pressable>
  );
}
