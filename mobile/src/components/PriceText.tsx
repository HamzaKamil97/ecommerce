import { Text, TextStyle } from 'react-native';
import { useTheme } from '../theme/useTheme';

interface PriceTextProps {
  amount?: number | null;
  currencyCode?: string;
  style?: TextStyle;
}

export function PriceText({ amount, currencyCode = 'USD', style }: PriceTextProps) {
  const { colors, typography } = useTheme();
  if (amount == null) return null;
  const formatted = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currencyCode.toUpperCase(),
  }).format(amount);
  return <Text style={[typography.heading, { color: colors.text }, style]}>{formatted}</Text>;
}
