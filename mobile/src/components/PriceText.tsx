import { Text, TextStyle, View, StyleSheet } from 'react-native';
import { tokens } from '../theme/tokens';

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

function formatIQDNumber(amount: number): string {
  return new Intl.NumberFormat('en-IQ').format(Math.round(amount));
}

function formatUSDNumber(amountCents: number): string {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    amountCents / 100,
  );
}

function splitPrimary(upper: string, amount: number): { number: string; code: string } {
  if (upper === 'IQD') return { number: formatIQDNumber(amount), code: 'IQD' };
  return { number: `$${formatUSDNumber(amount)}`, code: 'USD' };
}

function formatSecondary(upper: string, amount: number, fxRate: number): string {
  if (upper === 'IQD') {
    return `$${formatUSDNumber(Math.round((amount / fxRate) * 100))} USD`;
  }
  return `${formatIQDNumber((amount / 100) * fxRate)} IQD`;
}

export function PriceText({
  amount,
  currencyCode = 'IQD',
  fxRate = 1310,
  showSecondary = false,
  style,
}: PriceTextProps) {
  if (amount == null) return null;
  const upper = currencyCode.toUpperCase();
  const { number, code } = splitPrimary(upper, amount);
  const secondary = showSecondary ? formatSecondary(upper, amount, fxRate) : null;

  return (
    <View>
      <View style={styles.primaryRow}>
        <Text style={[styles.primaryNumber, style]}>{number}</Text>
        <Text style={styles.primaryCode}>{code}</Text>
      </View>
      {secondary && <Text style={styles.secondary}>{secondary}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  primaryRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  primaryNumber: {
    fontSize: tokens.fontSize.xl,
    fontFamily: tokens.fontFamily.monoBold,
    fontWeight: tokens.fontWeight.bold,
    color: tokens.colors.text,
  },
  primaryCode: {
    fontSize: tokens.fontSize.sm,
    fontFamily: tokens.fontFamily.semibold,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.textMuted,
    marginLeft: 4,
  },
  secondary: {
    fontSize: tokens.fontSize.sm,
    fontFamily: tokens.fontFamily.mono,
    color: tokens.colors.textMuted,
    marginTop: 2,
  },
});
