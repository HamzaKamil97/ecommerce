export const colors = {
  light: {
    background: '#FFFFFF',
    surface: '#F7F7F8',
    text: '#0B0B0F',
    textMuted: '#6B7280',
    primary: '#111111',
    primaryText: '#FFFFFF',
    border: '#E5E7EB',
    danger: '#DC2626',
    success: '#16A34A',
  },
  dark: {
    background: '#0B0B0F',
    surface: '#15151B',
    text: '#F7F7F8',
    textMuted: '#9CA3AF',
    primary: '#FFFFFF',
    primaryText: '#0B0B0F',
    border: '#27272A',
    danger: '#F87171',
    success: '#4ADE80',
  },
};

export type ThemeColors = typeof colors.light;
