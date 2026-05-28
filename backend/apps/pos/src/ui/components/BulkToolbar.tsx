import './BulkToolbar.css';

export type BulkAction = {
  id: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
};

type Props = {
  variant: 'dark' | 'paper';
  count: number;
  actions: BulkAction[];
  onClose: () => void;
};

export function BulkToolbar({ variant, count, actions, onClose }: Props) {
  return (
    <div className={`bulk-toolbar ${variant}`} role="toolbar" aria-label="Bulk actions">
      <div className="count-pill">
        <span className="n">{count}</span> selected
      </div>
      {actions.map((a) => (
        <button
          key={a.id}
          type="button"
          className={`bulk-action${a.danger ? ' danger' : ''}`}
          onClick={a.onClick}
        >
          {a.label}
        </button>
      ))}
      <div className="spacer" />
      <button
        type="button"
        className="bulk-close"
        onClick={onClose}
        aria-label="Close bulk toolbar"
      >
        ✕
      </button>
    </div>
  );
}
