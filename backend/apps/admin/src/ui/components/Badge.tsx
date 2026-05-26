import { HTMLAttributes } from 'react';
import './Badge.css';

export type BadgeVariant = 'ok' | 'warn' | 'crit' | 'info' | 'quiet';

export function Badge({ variant = 'info', className, children, ...rest }: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return <span className={`badge badge-${variant} ${className ?? ''}`} {...rest}>{children}</span>;
}
