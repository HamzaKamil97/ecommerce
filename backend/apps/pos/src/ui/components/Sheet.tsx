import { ReactNode, MouseEvent } from 'react';
import './Sheet.css';

export type SheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
};

export function Sheet({ open, onClose, title, children }: SheetProps) {
  if (!open) return null;
  function backdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }
  return (
    <div className="sheet-backdrop" onClick={backdropClick}>
      <div className="sheet" role="dialog" aria-labelledby="sheet-title">
        <div className="sheet-handle" aria-hidden="true"></div>
        <h2 id="sheet-title" className="sheet-title">{title}</h2>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}
