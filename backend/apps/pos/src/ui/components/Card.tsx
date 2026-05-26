import { HTMLAttributes } from 'react';
import './Card.css';

export type CardProps = HTMLAttributes<HTMLDivElement> & { interactive?: boolean };

export function Card({ interactive, className, children, ...rest }: CardProps) {
  return (
    <div className={`card ${interactive ? 'card-interactive' : ''} ${className ?? ''}`} {...rest}>
      {children}
    </div>
  );
}
