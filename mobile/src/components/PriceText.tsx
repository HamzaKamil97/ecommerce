import { Text, TextStyle, View } from 'react-native';
import { useTheme } from '../theme/useTheme';

interface PriceTextProps {
  /** Always in minor units of `currencyCode` (cents for USD, integer for IQD). */
  amount?: number | null;
  /** Primary currency code, lowercase or uppercase. */
  currencyCode?: string;
  /** FX_USD_TO_IQD rate from backend. */
  fxRate?: number;
  /** Render the opposite-currency line as muted secondary. */
  showSecondary?: boolean;
  style?: TextStyle;
}

function formatIQD(amount: number): string {
  return `${new Intl.NumberFormat('en-IQ').format(Math.round(amount))} IQD`;
}

function formatUSD(amountCents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amountCents / 100);
}

export function PriceText({
  amount,
  currencyCode = 'IQD',
  fxRate = 1310,
  showSecondary = false,
  style,
}: PriceTextProps) {
  const { colors, typography } = useTheme();
  if (amount == null) return null;
  const upper = currencyCode.toUpperCase();
  const primary = upper === 'IQD' ? formatIQD(amount) : formatUSD(amount);

  let secondary: string | null = null;
  if (showSecondary) {
    if (upper === 'IQD') {
      secondary = formatUSD(Math.round((amount / fxRate) * 100));
    } else {
      secondary = formatIQD((amount / 100) * fxRate);
    }
  }

  return (
    <View>
      <Text style={[typography.heading, { color: colors.text }, style]}>{primary}</Text>
      {secondary && (
        <Text style={[typography.caption, { color: colors.textMuted }]}>{secondary}</Text>
      )}
    </View>
  );
}
