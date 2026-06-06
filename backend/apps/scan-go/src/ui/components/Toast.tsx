import React, { useEffect, useState } from 'react';

export type ToastKind = 'ok' | 'bad';

export interface ToastMessage {
  id: number;
  kind: ToastKind;
  title: string;
  sub?: string;
}

interface ToastProps {
  toast: ToastMessage | null;
}

export function Toast({ toast }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!toast) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 2800);
    return () => clearTimeout(t);
  }, [toast?.id]);

  if (!visible || !toast) return null;

  const isOk = toast.kind === 'ok';

  return (
    <div style={{
      position: 'absolute',
      left: 14,
      right: 14,
      bottom: 90,
      zIndex: 25,
      borderRadius: 'var(--radius-xl)',
      padding: '11px 13px',
      display: 'flex',
      alignItems: 'center',
      gap: 11,
      boxShadow: 'var(--shadow-lg)',
      background: isOk ? '#143a2e' : '#3a1620',
      color: isOk ? '#eafff6' : '#ffe9ee',
      animation: 'sg-pop .3s ease',
    }}>
      <div style={{
        width: 32,
        height: 32,
        borderRadius: 9,
        display: 'grid',
        placeItems: 'center',
        fontSize: 16,
        flexShrink: 0,
        background: isOk ? 'rgba(47,106,85,.45)' : 'rgba(134,42,58,.5)',
      }}>
        {isOk ? '✓' : '✕'}
      </div>
      <div>
        <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.25 }}>{toast.title}</div>
        {toast.sub && (
          <span style={{ display: 'block', font: '600 11px/1.3 var(--sans)', opacity: 0.8, marginTop: 2 }}>
            {toast.sub}
          </span>
        )}
      </div>
    </div>
  );
}
