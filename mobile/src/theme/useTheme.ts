// DEPRECATED: use tokens directly. See SP-A2.
import { useColorScheme } from 'react-native';
import { colors } from './colors';
import { spacing, radius } from './spacing';
import { typography } from './typography';

export function useTheme() {
  const scheme = useColorScheme() ?? 'light';
  return {
    scheme,
    colors: scheme === 'dark' ? colors.dark : colors.light,
    spacing,
    radius,
    typography,
  };
}
