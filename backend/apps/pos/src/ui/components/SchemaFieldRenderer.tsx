import type { FieldDef } from '../../api/pos';

export function SchemaFieldRenderer({
  field, value, onChange,
}: { field: FieldDef; value: unknown; onChange: (v: unknown) => void }) {
  const label = (
    <label style={{ display: 'block', marginBottom: 4 }}>
      {field.label}{field.required && <span style={{ color: 'var(--danger)' }}> *</span>}
      {field.help && <small style={{ display: 'block', color: '#9CA3AF' }}>{field.help}</small>}
    </label>
  );

  if (field.kind === 'textarea') {
    return <div>{label}<textarea value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} /></div>;
  }
  if (field.kind === 'number' || field.kind === 'price_minor') {
    return <div>{label}<input type="number" value={(value as number) ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))} /></div>;
  }
  if (field.kind === 'select') {
    return (
      <div>{label}
        <select value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value || undefined)}>
          <option value="">—</option>
          {(field.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    );
  }
  if (field.kind === 'multi_select') {
    const list = (value as string[] | undefined) ?? [];
    return (
      <div>{label}
        {(field.options ?? []).map((o) => (
          <label key={o} style={{ marginRight: 8 }}>
            <input type="checkbox" checked={list.includes(o)} onChange={(e) => {
              const next = e.target.checked ? [...list, o] : list.filter((x) => x !== o);
              onChange(next);
            }} /> {o}
          </label>
        ))}
      </div>
    );
  }
  if (field.kind === 'boolean') {
    return (
      <div>{label}
        <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
      </div>
    );
  }
  if (field.kind === 'date') {
    return <div>{label}<input type="date" value={(value as string) ?? ''}
      onChange={(e) => onChange(e.target.value || undefined)} /></div>;
  }
  return <div>{label}<input type="text" value={(value as string) ?? ''}
    onChange={(e) => onChange(e.target.value)} /></div>;
}
