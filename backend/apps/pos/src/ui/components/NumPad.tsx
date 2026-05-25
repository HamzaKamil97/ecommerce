export function NumPad({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const keys = ['1','2','3','4','5','6','7','8','9','000','0','⌫'];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
      {keys.map((k) => (
        <button key={k} onClick={() => {
          if (k === '⌫') onChange(value.slice(0, -1));
          else onChange((value + k).slice(0, 10));
        }} style={{ padding: 24, fontSize: 24 }}>{k}</button>
      ))}
    </div>
  );
}
