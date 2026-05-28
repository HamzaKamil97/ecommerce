import { ReactNode } from 'react';
import './CapabilityPill.css';

export type CapabilityPillVariant = 'allow' | 'pin' | 'deny' | 'override-on' | 'override-off';

type Props = {
  variant: CapabilityPillVariant;
  children: ReactNode;
  title?: string;
};

export function CapabilityPill({ variant, children, title }: Props) {
  return (
    <span className={`cap-pill ${variant}`} title={title}>
      {children}
    </span>
  );
}
