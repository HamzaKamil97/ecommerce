import './DenominationGrid.css';

export type DenominationGridProps = {
  value: Record<string, number>;
  onChange: (denom: string, count: number) => void;
};

type Denom = {
  key: string;
  amount: number;
  label: string;
  short: string;
  swatchClass: string;
};

const DENOMS: Denom[] = [
  { key: '50000', amount: 50000, label: '50,000', short: '50K', swatchClass: 's-50k' },
  { key: '25000', amount: 25000, label: '25,000', short: '25K', swatchClass: 's-25k' },
  { key: '10000', amount: 10000, label: '10,000', short: '10K', swatchClass: 's-10k' },
  { key: '5000', amount: 5000, label: '5,000', short: '5K', swatchClass: 's-5k' },
  { key: '1000', amount: 1000, label: '1,000', short: '1K', swatchClass: 's-1k' },
  { key: '250', amount: 250, label: '250', short: '250D', swatchClass: 's-250' },
];

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

export function DenominationGrid({ value, onChange }: DenominationGridProps) {
  const total = DENOMS.reduce((sum, d) => {
    const c = value[d.key] ?? 0;
    return sum + c * d.amount;
  }, 0);

  return (
    <div className="denom-grid">
      <table className="denom-table">
        <thead>
          <tr>
            <th>Denomination</th>
            <th className="num-h">Count</th>
            <th className="num-h">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {DENOMS.map((d) => {
            const count = value[d.key] ?? 0;
            const subtotal = count * d.amount;
            return (
              <tr key={d.key}>
                <td>
                  <div className="denom-name">
                    <div className={`denom-swatch ${d.swatchClass}`}>{d.short}</div>
                    <span className="num">{d.label}</span>
                  </div>
                </td>
                <td className="denom-count-cell">
                  <input
                    type="number"
                    min={0}
                    className="denom-cnt-input num"
                    value={count}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      onChange(d.key, Number.isFinite(v) && v >= 0 ? v : 0);
                    }}
                    aria-label={`Count of ${d.label}`}
                  />
                </td>
                <td className="denom-subtotal num">{fmt(subtotal)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="denom-foot">
        <span className="denom-foot-label">Counted total</span>
        <span className="denom-foot-val num">{fmt(total)} IQD</span>
      </div>
    </div>
  );
}
