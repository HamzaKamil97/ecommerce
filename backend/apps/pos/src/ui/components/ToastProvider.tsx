import { createContext, useCallback, useContext, useState, ReactNode } from 'react';
import { Toast, ToastVariant } from './Toast';

type ToastItem = { id: number; variant: ToastVariant; title: string; meta?: string };

type ToastApi = {
  default: (title: string, meta?: string) => void;
  success: (title: string, meta?: string) => void;
  warning: (title: string, meta?: string) => void;
  error: (title: string, meta?: string) => void;
};

const ToastCtx = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((variant: ToastVariant, title: string, meta?: string) => {
    setItems((arr) => [...arr, { id: Date.now() + Math.random(), variant, title, meta }]);
  }, []);
  const dismiss = useCallback((id: number) => {
    setItems((arr) => arr.filter((t) => t.id !== id));
  }, []);

  const api: ToastApi = {
    default: (t, m) => push('default', t, m),
    success: (t, m) => push('success', t, m),
    warning: (t, m) => push('warning', t, m),
    error: (t, m) => push('error', t, m),
  };

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="toast-stack">
        {items.map((t) => (
          <Toast key={t.id} variant={t.variant} title={t.title} meta={t.meta} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
