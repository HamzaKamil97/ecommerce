import { View, Text } from 'react-native';
import { VerticalFields } from '../api/products';
import { useTheme } from '../theme/useTheme';

interface Props {
  data: VerticalFields | null;
}

const FORMATTERS: Record<string, (v: any) => string> = {
  prep_minutes: (v) => `${v} min prep`,
  spice_level: (v) => `Spice: ${v}`,
  stem_count: (v) => `${v} stems`,
  weight_per_unit_g: (v) => `${v}g per unit`,
  warranty_months: (v) => `${v} month warranty`,
  brand: (v) => `Brand: ${v}`,
  model: (v) => `Model: ${v}`,
  material: (v) => `Material: ${v}`,
  expiry_at: (v) => `Best before ${new Date(v).toLocaleDateString()}`,
  harvest_date: (v) => `Harvested ${new Date(v).toLocaleDateString()}`,
};

// Renders the per-vertical product attributes in a clean spec block.
// Different verticals get different visual emphasis.
export function VerticalFieldsBlock({ data }: Props) {
  const { colors, spacing, radius, typography } = useTheme();
  if (!data || !data.fields || !data.template) return null;

  const fields = data.fields ?? {};
  const schema = data.template.fields;

  // Build human-readable display rows from the schema + actual values.
  const rows: Array<{ label: string; value: string }> = [];
  for (const f of schema) {
    const raw = fields[f.key];
    if (raw === undefined || raw === null || raw === '' || (Array.isArray(raw) && raw.length === 0)) {
      continue;
    }
    const formatter = FORMATTERS[f.key];
    let display = '';
    if (formatter) {
      display = formatter(raw);
    } else if (typeof raw === 'boolean') {
      display = raw ? 'Yes' : 'No';
    } else if (Array.isArray(raw)) {
      display = raw.join(', ');
    } else if (typeof raw === 'object') {
      display = JSON.stringify(raw);
    } else {
      display = String(raw);
    }
    rows.push({ label: f.label, value: display });
  }

  if (rows.length === 0) return null;

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        padding: spacing.md,
        marginTop: spacing.lg,
        gap: spacing.sm,
      }}
    >
      <Text style={[typography.heading, { color: colors.text }]}>
        {data.template.emoji} {data.template.label} details
      </Text>
      {rows.map((r, i) => (
        <View
          key={i}
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingVertical: 6,
            borderBottomWidth: i < rows.length - 1 ? 1 : 0,
            borderBottomColor: colors.border,
          }}
        >
          <Text style={[typography.body, { color: colors.textMuted }]}>{r.label}</Text>
          <Text style={[typography.body, { color: colors.text, fontWeight: '600', textAlign: 'right', flex: 1, marginLeft: 12 }]}>
            {r.value}
          </Text>
        </View>
      ))}
    </View>
  );
}
