// Single source of truth for design tokens — Hanoot ivory + gold.
// Foundational reskin per docs/superpowers/design-pack-2026-05-21.

export const tokens = {
  colors: {
    bg: '#f4ede1',          // ivory — page background
    surface: '#faf6ee',     // paper — card surface
    surfaceAlt: '#ebe2d2',  // ivory-2 — input bg / muted surface
    text: '#1f1c18',        // ink — primary text
    textSubtle: '#3a352d',  // ink-2 — secondary text
    textMuted: '#6f6859',   // ink-3 — captions, placeholders
    border: '#b9af9b',      // line — borders
    borderSubtle: '#e0d7c4',// line-2 — subtle dividers
    borderStrong: '#b9af9b',// legacy alias of border (pre-reskin consumers)
    primary: '#b88a3a',     // gold — primary accent
    primaryDark: '#8a6a2c', // pressed/dark gold
    accent: '#b88a3a',      // gold — synonym for primary (backward compat)
    accentDark: '#8a6a2c',  // legacy alias of primaryDark
    accentSoft: '#e9d9b3',  // soft gold tint for backgrounds
    success: '#2f6a55',     // emerald
    danger: '#862a3a',      // burgundy
    warning: '#b88a3a',     // gold (same as primary)
    info: '#3a352d',        // ink-2 (neutral info)
    white: '#ffffff',
    black: '#1f1c18',
    // tier accents (Hanoot Pass — used in A-Re3)
    tierFidda: '#9ea8b4',   // silver
    tierDhahab: '#b88a3a',  // gold
    tierKhass: '#1f1c18',   // black + gold gradient elsewhere
  },
  spacing: {
    xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48,
  },
  radius: {
    sm: 6, md: 10, lg: 14, xl: 18, pill: 999,
  },
  fontSize: {
    xs: 11, sm: 12, base: 14, md: 15, lg: 18, xl: 22, xxl: 28, display: 32,
  },
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
  fontFamily: {
    display: 'Manrope_800ExtraBold',
    bold: 'Manrope_700Bold',
    semibold: 'Manrope_600SemiBold',
    body: 'Manrope_500Medium',
    light: 'Manrope_400Regular',
    mono: 'JetBrainsMono_500Medium',
    monoBold: 'JetBrainsMono_700Bold',
    arabic: 'NotoSansArabic_500Medium',
    arabicBold: 'NotoSansArabic_700Bold',
  },
  shadow: {
    card: {
      shadowColor: '#1f1c18',
      shadowOpacity: 0.08,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 8,
      elevation: 2,
    },
    floating: {
      shadowColor: '#1f1c18',
      shadowOpacity: 0.14,
      shadowOffset: { width: 0, height: 6 },
      shadowRadius: 16,
      elevation: 6,
    },
    inset: {
      shadowColor: '#1f1c18',
      shadowOpacity: 0.04,
      shadowOffset: { width: 0, height: 1 },
      shadowRadius: 2,
      elevation: 1,
    },
  },
} as const;

export type Tokens = typeof tokens;
