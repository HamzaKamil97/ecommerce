import './DiffView.css';

function changedKeys(before: any, after: any): string[] {
  const keys = new Set<string>([
    ...Object.keys(before ?? {}),
    ...Object.keys(after ?? {}),
  ]);
  return [...keys].filter(
    (k) => JSON.stringify(before?.[k]) !== JSON.stringify(after?.[k]),
  );
}

type Props = {
  before: any;
  after: any;
};

export function DiffView({ before, after }: Props) {
  const keys = changedKeys(before, after);
  if (!keys.length) {
    return <div className="diff-view diff-empty">no changes</div>;
  }
  return (
    <div className="diff-view">
      {keys.map((k) => (
        <div key={k} className="diff-key-block">
          {before && k in (before ?? {}) && (
            <div className="diff-line pre">
              <span className="key">{k}:</span> {String(before[k])}
            </div>
          )}
          {after && k in (after ?? {}) && (
            <div className="diff-line post">
              <span className="key">{k}:</span> {String(after[k])}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
