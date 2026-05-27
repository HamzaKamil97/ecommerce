import { ReactNode } from 'react';
import './PhoneFrame.css';

export type PhoneFrameProps = { children: ReactNode };

function isPhoneDevFlag(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.search.includes('dev=phone');
}

export function PhoneFrame({ children }: PhoneFrameProps) {
  if (!isPhoneDevFlag()) return <>{children}</>;
  return (
    <div className="phone-frame-stage">
      <div className="phone-frame">{children}</div>
    </div>
  );
}
