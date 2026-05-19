// Single source of truth for design tokens.
// Existing screens keep importing from colors.ts — this file re-exports those
// colors alongside the new expanded token set.

export const tokens = {
  fontSize: { xs: 11, sm: 13, base: 14, md: 16, lg: 18, xl: 22, xxl: 28 },
  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  } as const,
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 },
  radius: { sm: 8, md: 12, lg: 16, pill: 999 },
  shadow: {
    card: {
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 8,
      elevation: 2,
    },
    floating: {
      shadowColor: '#000',
      shadowOpacity: 0.18,
      shadowOffset: { width: 0, height: 6 },
      shadowRadius: 16,
      elevation: 8,
    },
  },
  colors: {
    primary: '#0F766E',
    primaryDark: '#115E59',
    accent: '#F59E0B',
    accentDark: '#D97706',
    bg: '#FFFFFF',
    surface: '#F7F7F8',
    surfaceAlt: '#F0F1F3',
    text: '#0B0B0F',
    textMuted: '#6B7280',
    textSubtle: '#9CA3AF',
    border: '#E5E7EB',
    borderStrong: '#D1D5DB',
    danger: '#DC2626',
    success: '#16A34A',
    warning: '#F59E0B',
    white: '#FFFFFF',
  },
}

export type Tokens = typeof tokens
