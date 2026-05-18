import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../theme/useTheme';

interface Props {
  value: number;             // 0-5
  size?: number;
  editable?: boolean;
  onChange?: (v: number) => void;
}

export function StarRating({ value, size = 20, editable = false, onChange }: Props) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = i <= value;
        const child = (
          <Text style={{ fontSize: size, color: filled ? '#F5C518' : colors.border }}>
            {filled ? '★' : '☆'}
          </Text>
        );
        if (editable && onChange) {
          return (
            <Pressable key={i} onPress={() => onChange(i)} hitSlop={6}>
              {child}
            </Pressable>
          );
        }
        return <View key={i}>{child}</View>;
      })}
    </View>
  );
}
