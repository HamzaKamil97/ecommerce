import { ReactNode, useEffect, useRef } from 'react';
import './Popover.css';

export type PopoverProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function Popover({ open, onClose, children }: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div ref={ref} className="popover anim-pop-in" role="menu">
      {children}
    </div>
  );
}
