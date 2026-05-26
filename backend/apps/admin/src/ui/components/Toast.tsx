import './Toast.css';

export type ToastVariant = 'default' | 'success' | 'warning' | 'error';

export function Toast({
  variant, title, meta, onDismiss,
}: { variant: ToastVariant; title: string; meta?: string; onDismiss: () => void }) {
  return (
    <div className={`toast toast-${variant} anim-bump-in`} role="status">
      <div className="toast-body">
        <div className="toast-title">{title}</div>
        {meta && <div className="toast-meta">{meta}</div>}
      </div>
      <button aria-label="dismiss" className="toast-close" onClick={onDismiss}>✕</button>
    </div>
  );
}
