import { ReactNode, MouseEvent } from 'react';
import './Modal.css';

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
};

export function Modal({ open, onClose, title, children, actions }: ModalProps) {
  if (!open) return null;
  function backdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }
  return (
    <div className="modal-backdrop" onClick={backdropClick}>
      <div className="modal-shell anim-pop-in" role="dialog" aria-labelledby="modal-title">
        <h2 id="modal-title" className="modal-title">{title}</h2>
        <div className="modal-body">{children}</div>
        {actions && <div className="modal-actions">{actions}</div>}
      </div>
    </div>
  );
}
